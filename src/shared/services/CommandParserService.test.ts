/**
 * Unit tests for CommandParserService
 * Tests command parsing, validation, and execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParserService } from './CommandParserService';
import type { ChatContext, Command } from '../types/services';

describe('CommandParserService', () => {
  let service: CommandParserService;

  beforeEach(() => {
    service = CommandParserService.getInstance();
  });

  describe('parseCommand', () => {
    it('should parse /new command', () => {
      const result = service.parseCommand('/new');
      expect(result).toEqual({ type: 'new' });
    });

    it('should parse /revert command', () => {
      const result = service.parseCommand('/revert');
      expect(result).toEqual({ type: 'revert' });
    });

    it('should handle commands with extra whitespace', () => {
      expect(service.parseCommand('  /new  ')).toEqual({ type: 'new' });
      expect(service.parseCommand('  /revert  ')).toEqual({ type: 'revert' });
    });

    it('should be case-insensitive', () => {
      expect(service.parseCommand('/NEW')).toEqual({ type: 'new' });
      expect(service.parseCommand('/Revert')).toEqual({ type: 'revert' });
      expect(service.parseCommand('/REVERT')).toEqual({ type: 'revert' });
    });

    it('should return null for non-command input', () => {
      expect(service.parseCommand('hello world')).toBeNull();
      expect(service.parseCommand('this is a message')).toBeNull();
      expect(service.parseCommand('')).toBeNull();
    });

    it('should return null for unknown commands', () => {
      expect(service.parseCommand('/unknown')).toBeNull();
      expect(service.parseCommand('/help')).toBeNull();
      expect(service.parseCommand('/delete')).toBeNull();
    });

    it('should return null for malformed commands', () => {
      expect(service.parseCommand('/')).toBeNull();
      expect(service.parseCommand('/ ')).toBeNull();
      expect(service.parseCommand('/123')).toBeNull();
    });

    it('should handle commands with trailing text', () => {
      // Commands should be recognized even with trailing text
      expect(service.parseCommand('/new session')).toEqual({ type: 'new' });
      expect(service.parseCommand('/revert last')).toEqual({ type: 'revert' });
    });
  });

  describe('validateCommand', () => {
    it('should validate known commands', () => {
      expect(service.validateCommand('/new')).toEqual({ valid: true });
      expect(service.validateCommand('/revert')).toEqual({ valid: true });
    });

    it('should validate non-command input', () => {
      expect(service.validateCommand('hello')).toEqual({ valid: true });
      expect(service.validateCommand('this is a message')).toEqual({ valid: true });
    });

    it('should return error for unknown commands', () => {
      const result = service.validateCommand('/unknown');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown command');
      expect(result.error).toContain('/unknown');
    });

    it('should provide helpful error messages', () => {
      const result = service.validateCommand('/help');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Available commands');
      expect(result.error).toContain('/new');
      expect(result.error).toContain('/revert');
    });
  });

  describe('executeCommand - /new', () => {
    it('should clear messages and generate new session ID', () => {
      const context: ChatContext = {
        sessionId: 'old-session-id',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Hi there',
            timestamp: Date.now(),
          },
        ],
        currentFile: null,
      };

      const command: Command = { type: 'new' };
      service.executeCommand(command, context);

      // Messages should be cleared
      expect(context.messages).toHaveLength(0);

      // Session ID should be changed
      expect(context.sessionId).not.toBe('old-session-id');
      expect(context.sessionId).toBeTruthy();
    });

    it('should generate unique session IDs', () => {
      const context1: ChatContext = {
        sessionId: 'id1',
        messages: [],
        currentFile: null,
      };

      const context2: ChatContext = {
        sessionId: 'id2',
        messages: [],
        currentFile: null,
      };

      const command: Command = { type: 'new' };
      service.executeCommand(command, context1);
      service.executeCommand(command, context2);

      expect(context1.sessionId).not.toBe(context2.sessionId);
    });
  });

  describe('executeCommand - /revert', () => {
    it('should throw error when no file is open', () => {
      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [],
        currentFile: null,
      };

      const command: Command = { type: 'revert' };

      expect(() => service.executeCommand(command, context)).toThrow(
        'No file is currently open to revert changes'
      );
    });

    it('should throw error when no modifications found', () => {
      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Hi there',
            timestamp: Date.now(),
          },
        ],
        currentFile: mockFile,
      };

      const command: Command = { type: 'revert' };

      expect(() => service.executeCommand(command, context)).toThrow(
        'No file modifications found to revert'
      );
    });

    it('should succeed when file modifications exist', () => {
      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Add some text',
            timestamp: Date.now(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'I will add the text',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-1',
                name: 'write_append',
                arguments: { content: 'New text' },
                result: { success: true },
              },
            ],
          },
        ],
        currentFile: mockFile,
      };

      const command: Command = { type: 'revert' };

      // Should not throw
      expect(() => service.executeCommand(command, context)).not.toThrow();
    });

    it('should find last modifying message with write_append', () => {
      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Reading file',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-1',
                name: 'read_file',
                arguments: {},
                result: 'file content',
              },
            ],
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Writing to file',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-2',
                name: 'write_append',
                arguments: { content: 'new content' },
                result: { success: true },
              },
            ],
          },
        ],
        currentFile: mockFile,
      };

      const command: Command = { type: 'revert' };

      // Should not throw because write_append was found
      expect(() => service.executeCommand(command, context)).not.toThrow();
    });

    it('should find last modifying message with find_replace', () => {
      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Replacing text',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-1',
                name: 'find_replace',
                arguments: { find: 'old', replace: 'new' },
                result: { success: true, replacements: 1 },
              },
            ],
          },
        ],
        currentFile: mockFile,
      };

      const command: Command = { type: 'revert' };

      // Should not throw because find_replace was found
      expect(() => service.executeCommand(command, context)).not.toThrow();
    });

    it('should ignore non-modifying tool calls', () => {
      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      const context: ChatContext = {
        sessionId: 'session-1',
        messages: [
          {
            id: '1',
            role: 'assistant',
            content: 'Reading workspace',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-1',
                name: 'read_workspace',
                arguments: {},
                result: [],
              },
            ],
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Searching files',
            timestamp: Date.now(),
            toolCalls: [
              {
                id: 'call-2',
                name: 'grep_search',
                arguments: { pattern: 'test' },
                result: [],
              },
            ],
          },
        ],
        currentFile: mockFile,
      };

      const command: Command = { type: 'revert' };

      // Should throw because no modifying tools were found
      expect(() => service.executeCommand(command, context)).toThrow(
        'No file modifications found to revert'
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CommandParserService.getInstance();
      const instance2 = CommandParserService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
