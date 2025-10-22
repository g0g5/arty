/**
 * LLMService Unit Tests
 * Tests API calls with mock fetch responses
 * Tests streaming response handling
 * Tests error handling for various API failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService, LLMServiceError } from './LLMService';
import type { ProviderProfile, ChatMessage, ToolDefinition } from '../types/models';

describe('LLMService', () => {
  let service: LLMService;
  let mockProvider: ProviderProfile;

  beforeEach(() => {
    service = LLMService.getInstance();
    vi.clearAllMocks();

    // Mock provider profile
    mockProvider = {
      id: 'provider-1',
      name: 'Test Provider',
      baseUrl: 'https://api.test.com/v1',
      apiKey: 'encrypted-test-key',
      models: ['test-model-1', 'test-model-2'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Mock StorageService decryptApiKey
    vi.spyOn(service as any, 'storageService', 'get').mockReturnValue({
      decryptApiKey: vi.fn().mockResolvedValue('decrypted-api-key'),
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LLMService.getInstance();
      const instance2 = LLMService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendMessage - Non-Streaming', () => {
    it('should send message and return assistant response', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, AI!',
          timestamp: Date.now(),
        },
      ];

      const mockResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model-1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.sendMessage(
        mockProvider,
        'test-model-1',
        mockMessages
      );

      expect(result).toEqual({
        id: 'resp-1',
        role: 'assistant',
        content: 'Hello! How can I help you?',
        timestamp: expect.any(Number),
        toolCalls: undefined,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer decrypted-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('test-model-1'),
        })
      );
    });

    it('should send message with tools', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Read the file',
          timestamp: Date.now(),
        },
      ];

      const mockTools: ToolDefinition[] = [
        {
          name: 'read_file',
          description: 'Read file content',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string' },
            },
            required: ['path'],
          },
        },
      ];

      const mockResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model-1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'read_file',
                    arguments: '{"path":"test.txt"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.sendMessage(
        mockProvider,
        'test-model-1',
        mockMessages,
        mockTools
      );

      expect(result.toolCalls).toEqual([
        {
          id: 'call-1',
          name: 'read_file',
          arguments: { path: 'test.txt' },
        },
      ]);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0].function.name).toBe('read_file');
    });

    it('should handle messages with tool results', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Read the file',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          toolCalls: [
            {
              id: 'call-1',
              name: 'read_file',
              arguments: { path: 'test.txt' },
              result: 'File content here',
            },
          ],
        },
      ];

      const mockResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model-1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant' as const,
              content: 'The file contains: File content here',
            },
            finish_reason: 'stop',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.sendMessage(mockProvider, 'test-model-1', mockMessages);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      
      // Should have user message, assistant message with tool_calls, and tool result message
      expect(requestBody.messages).toHaveLength(3);
      expect(requestBody.messages[2]).toEqual({
        role: 'tool',
        tool_call_id: 'call-1',
        name: 'read_file',
        content: '"File content here"',
      });
    });
  });

  describe('sendMessage - Streaming', () => {
    it('should handle streaming response', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Tell me a story',
          timestamp: Date.now(),
        },
      ];

      const streamChunks = [
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"role":"assistant","content":"Once"},"finish_reason":null}]}\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"content":" a"},"finish_reason":null}]}\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"content":" time"},"finish_reason":null}]}\n',
        'data: [DONE]\n',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of streamChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      });

      const streamedChunks: string[] = [];
      const onStream = (chunk: string) => {
        streamedChunks.push(chunk);
      };

      const result = await service.sendMessage(
        mockProvider,
        'test-model-1',
        mockMessages,
        undefined,
        onStream
      );

      expect(result.content).toBe('Once upon a time');
      expect(streamedChunks).toEqual(['Once', ' upon', ' a', ' time']);
      expect(result.id).toBe('resp-1');
      expect(result.role).toBe('assistant');
    });

    it('should handle streaming response with tool calls', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Read the file',
          timestamp: Date.now(),
        },
      ];

      const streamChunks = [
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"read_file","arguments":""}}]},"finish_reason":null}]}\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path"}}]},"finish_reason":null}]}\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\":\\"test.txt\\"}"}}]},"finish_reason":null}]}\n',
        'data: [DONE]\n',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of streamChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      });

      const result = await service.sendMessage(
        mockProvider,
        'test-model-1',
        mockMessages,
        undefined,
        vi.fn()
      );

      expect(result.toolCalls).toEqual([
        {
          id: 'call-1',
          name: 'read_file',
          arguments: { path: 'test.txt' },
        },
      ]);
    });

    it('should throw error when streaming not supported', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      });

      await expect(
        service.sendMessage(
          mockProvider,
          'test-model-1',
          mockMessages,
          undefined,
          vi.fn()
        )
      ).rejects.toThrow(LLMServiceError);

      try {
        await service.sendMessage(
          mockProvider,
          'test-model-1',
          mockMessages,
          undefined,
          vi.fn()
        );
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('STREAM_ERROR');
        expect((error as LLMServiceError).message).toContain('Streaming not supported');
      }
    });

    it('should handle malformed streaming chunks gracefully', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      const streamChunks = [
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n',
        'data: invalid json here\n',
        'data: {"id":"resp-1","object":"chat.completion.chunk","created":1234567890,"model":"test-model-1","choices":[{"index":0,"delta":{"content":" there"},"finish_reason":null}]}\n',
        'data: [DONE]\n',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of streamChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      });

      const result = await service.sendMessage(
        mockProvider,
        'test-model-1',
        mockMessages,
        undefined,
        vi.fn()
      );

      // Should still process valid chunks
      expect(result.content).toBe('Hello there');
    });
  });

  describe('listModels', () => {
    it('should list available models from provider', async () => {
      const mockResponse = {
        object: 'list',
        data: [
          {
            id: 'model-1',
            object: 'model',
            created: 1234567890,
            owned_by: 'test-org',
          },
          {
            id: 'model-2',
            object: 'model',
            created: 1234567891,
            owned_by: 'test-org',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.listModels(mockProvider);

      expect(result).toEqual(['model-1', 'model-2']);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer decrypted-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle empty models list', async () => {
      const mockResponse = {
        object: 'list',
        data: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.listModels(mockProvider);

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw AUTH_ERROR for 401 status', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid API key',
          },
        }),
      });

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('AUTH_ERROR');
        expect((error as LLMServiceError).statusCode).toBe(401);
        expect((error as LLMServiceError).message).toContain('Invalid API key');
      }
    });

    it('should throw AUTH_ERROR for 403 status', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            message: 'Access forbidden',
          },
        }),
      });

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('AUTH_ERROR');
        expect((error as LLMServiceError).statusCode).toBe(403);
      }
    });

    it('should throw RATE_LIMIT for 429 status', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Rate limit exceeded',
          },
        }),
      });

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('RATE_LIMIT');
        expect((error as LLMServiceError).statusCode).toBe(429);
        expect((error as LLMServiceError).message).toContain('Rate limit exceeded');
      }
    });

    it('should throw API_ERROR for 500 status', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: 'Internal server error',
          },
        }),
      });

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('API_ERROR');
        expect((error as LLMServiceError).statusCode).toBe(500);
      }
    });

    it('should handle error response without JSON body', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
        text: async () => 'Server error text',
      });

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).message).toContain('Server error text');
      }
    });

    it('should throw API_ERROR for network failures', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      try {
        await service.sendMessage(mockProvider, 'test-model-1', mockMessages);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('API_ERROR');
        expect((error as LLMServiceError).message).toContain('Network error');
      }
    });

    it('should handle listModels errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Unauthorized',
          },
        }),
      });

      try {
        await service.listModels(mockProvider);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('AUTH_ERROR');
      }
    });

    it('should handle stream processing errors', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ];

      const stream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'));
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      });

      try {
        await service.sendMessage(
          mockProvider,
          'test-model-1',
          mockMessages,
          undefined,
          vi.fn()
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).code).toBe('STREAM_ERROR');
      }
    });
  });

  describe('URL Building', () => {
    it('should handle base URL with trailing slash', async () => {
      const providerWithTrailingSlash = {
        ...mockProvider,
        baseUrl: 'https://api.test.com/v1/',
      };

      const mockResponse = {
        object: 'list',
        data: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.listModels(providerWithTrailingSlash);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/models',
        expect.any(Object)
      );
    });

    it('should handle base URL without trailing slash', async () => {
      const providerWithoutTrailingSlash = {
        ...mockProvider,
        baseUrl: 'https://api.test.com/v1',
      };

      const mockResponse = {
        object: 'list',
        data: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.listModels(providerWithoutTrailingSlash);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/models',
        expect.any(Object)
      );
    });
  });
});
