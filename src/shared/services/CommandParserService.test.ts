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

    it('should handle commands with extra whitespace', () => {
      expect(service.parseCommand('  /new  ')).toEqual({ type: 'new' });
    });

    it('should be case-insensitive', () => {
      expect(service.parseCommand('/NEW')).toEqual({ type: 'new' });
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
    });
  });

  describe('validateCommand', () => {
    it('should validate known commands', () => {
      expect(service.validateCommand('/new')).toEqual({ valid: true });
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

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CommandParserService.getInstance();
      const instance2 = CommandParserService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
