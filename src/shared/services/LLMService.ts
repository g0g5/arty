/**
 * LLM Service
 * Manages communication with OpenAI-compatible LLM providers
 * Supports streaming responses and tool calling protocol
 */

import type { ProviderProfile, ToolDefinition, ChatMessage, ToolCall } from '../types/models';
import type { ILLMService } from '../types/services';
import { StorageService } from './StorageService';

/**
 * OpenAI API Message Format
 */
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * OpenAI Tool Call Format
 */
interface OpenAIToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI Tool Definition Format
 */
interface OpenAITool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * OpenAI Chat Completion Request
 */
interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/**
 * OpenAI Chat Completion Response
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Streaming Chunk
 */
interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

/**
 * OpenAI Models List Response
 */
interface ModelsListResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

/**
 * LLM Service Error Types
 */
export class LLMServiceError extends Error {
  public code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'API_ERROR' | 'STREAM_ERROR';
  public statusCode?: number;
  public details?: any;

  constructor(
    message: string,
    code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'API_ERROR' | 'STREAM_ERROR',
    statusCode?: number,
    details?: any
  ) {
    super(message);
    this.name = 'LLMServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * LLM Service Implementation
 */
export class LLMService implements ILLMService {
  private static instance: LLMService;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * Get singleton instance of LLMService
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Send message to LLM provider with optional streaming
   */
  public async sendMessage(
    provider: ProviderProfile,
    model: string,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    onStream?: (chunk: string) => void
  ): Promise<ChatMessage> {
    try {
      // Decrypt API key
      const apiKey = await this.storageService.decryptApiKey(provider.apiKey);

      // Convert messages to OpenAI format
      const openAIMessages = this.convertToOpenAIMessages(messages);

      // Convert tools to OpenAI format
      const openAITools = tools ? this.convertToOpenAITools(tools) : undefined;

      // Build request
      const request: ChatCompletionRequest = {
        model,
        messages: openAIMessages,
        tools: openAITools,
        stream: !!onStream,
      };

      // Make API call
      if (onStream) {
        return await this.sendStreamingRequest(provider, apiKey, request, onStream);
      } else {
        return await this.sendNonStreamingRequest(provider, apiKey, request);
      }
    } catch (error) {
      if (error instanceof LLMServiceError) {
        throw error;
      }
      throw new LLMServiceError(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        undefined,
        error
      );
    }
  }

  /**
   * List available models from provider
   */
  public async listModels(provider: ProviderProfile): Promise<string[]> {
    try {
      // Decrypt API key
      const apiKey = await this.storageService.decryptApiKey(provider.apiKey);

      // Build URL
      const url = this.buildUrl(provider.baseUrl, '/models');

      // Make request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle errors
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse response
      const data: ModelsListResponse = await response.json();

      // Extract model IDs
      return data.data.map(model => model.id);
    } catch (error) {
      if (error instanceof LLMServiceError) {
        throw error;
      }
      throw new LLMServiceError(
        `Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        undefined,
        error
      );
    }
  }

  /**
   * Send non-streaming request
   */
  private async sendNonStreamingRequest(
    provider: ProviderProfile,
    apiKey: string,
    request: ChatCompletionRequest
  ): Promise<ChatMessage> {
    // Build URL
    const url = this.buildUrl(provider.baseUrl, '/chat/completions');

    // Make request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    // Handle errors
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Parse response
    const data: ChatCompletionResponse = await response.json();

    // Convert to ChatMessage
    return this.convertFromOpenAIResponse(data);
  }

  /**
   * Send streaming request
   */
  private async sendStreamingRequest(
    provider: ProviderProfile,
    apiKey: string,
    request: ChatCompletionRequest,
    onStream: (chunk: string) => void
  ): Promise<ChatMessage> {
    // Build URL
    const url = this.buildUrl(provider.baseUrl, '/chat/completions');

    // Make request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    // Handle errors
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // Check for streaming support
    if (!response.body) {
      throw new LLMServiceError(
        'Streaming not supported by provider',
        'STREAM_ERROR'
      );
    }

    // Process stream
    return await this.processStream(response.body, onStream);
  }

  /**
   * Process streaming response
   */
  private async processStream(
    body: ReadableStream<Uint8Array>,
    onStream: (chunk: string) => void
  ): Promise<ChatMessage> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    
    let content = '';
    let toolCalls: ToolCall[] = [];
    let messageId = '';
    
    // Track partial tool calls during streaming
    const partialToolCalls: Map<number, {
      id?: string;
      name?: string;
      arguments: string;
    }> = new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Split by lines (SSE format)
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          // Skip empty lines
          if (!line.trim() || line.trim() === 'data: [DONE]') {
            continue;
          }

          // Parse SSE data
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data: ChatCompletionChunk = JSON.parse(jsonStr);
              
              // Store message ID
              if (!messageId) {
                messageId = data.id;
              }

              // Process delta
              const delta = data.choices[0]?.delta;
              
              if (delta?.content) {
                content += delta.content;
                onStream(delta.content);
              }

              // Process tool calls
              if (delta?.tool_calls) {
                for (const toolCallDelta of delta.tool_calls) {
                  const index = toolCallDelta.index;
                  
                  if (!partialToolCalls.has(index)) {
                    partialToolCalls.set(index, {
                      id: toolCallDelta.id,
                      name: toolCallDelta.function?.name,
                      arguments: ''
                    });
                  }
                  
                  const partial = partialToolCalls.get(index)!;
                  
                  if (toolCallDelta.id) {
                    partial.id = toolCallDelta.id;
                  }
                  
                  if (toolCallDelta.function?.name) {
                    partial.name = toolCallDelta.function.name;
                  }
                  
                  if (toolCallDelta.function?.arguments) {
                    partial.arguments += toolCallDelta.function.arguments;
                  }
                }
              }
            } catch (parseError) {
              console.error('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }

      // Convert partial tool calls to final format
      for (const [_, partial] of partialToolCalls) {
        if (partial.id && partial.name) {
          try {
            const args = JSON.parse(partial.arguments);
            toolCalls.push({
              id: partial.id,
              name: partial.name,
              arguments: args
            });
          } catch (parseError) {
            console.error('Failed to parse tool call arguments:', parseError);
          }
        }
      }

      // Create ChatMessage
      return {
        id: messageId || this.generateId(),
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      };
    } catch (error) {
      throw new LLMServiceError(
        `Stream processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_ERROR',
        undefined,
        error
      );
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert ChatMessage array to OpenAI format
   */
  private convertToOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
    const openAIMessages: OpenAIMessage[] = [];

    for (const message of messages) {
      // Add main message
      openAIMessages.push({
        role: message.role,
        content: message.content,
        tool_calls: message.toolCalls ? message.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        })) : undefined
      });

      // Add tool results as separate messages
      if (message.toolCalls) {
        for (const toolCall of message.toolCalls) {
          if (toolCall.result !== undefined) {
            openAIMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.name,
              content: JSON.stringify(toolCall.result)
            });
          }
        }
      }
    }

    return openAIMessages;
  }

  /**
   * Convert ToolDefinition array to OpenAI format
   */
  private convertToOpenAITools(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Convert OpenAI response to ChatMessage
   */
  private convertFromOpenAIResponse(response: ChatCompletionResponse): ChatMessage {
    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls: ToolCall[] | undefined = message.tool_calls?.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }));

    return {
      id: response.id,
      role: 'assistant',
      content: message.content || '',
      timestamp: Date.now(),
      toolCalls
    };
  }

  /**
   * Build full URL from base URL and path
   */
  private buildUrl(baseUrl: string, path: string): string {
    // Remove trailing slash from base URL
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Ensure path starts with slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${cleanBaseUrl}${cleanPath}`;
  }

  /**
   * Handle error response from API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `API request failed with status ${statusCode}`;
    let errorDetails: any;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
      errorDetails = errorData;
    } catch {
      // Failed to parse error response
      errorMessage = await response.text() || errorMessage;
    }

    // Determine error code
    let code: LLMServiceError['code'];
    
    if (statusCode === 401 || statusCode === 403) {
      code = 'AUTH_ERROR';
    } else if (statusCode === 429) {
      code = 'RATE_LIMIT';
    } else if (statusCode >= 500) {
      code = 'API_ERROR';
    } else if (!navigator.onLine) {
      code = 'NETWORK_ERROR';
    } else {
      code = 'API_ERROR';
    }

    throw new LLMServiceError(errorMessage, code, statusCode, errorDetails);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();
