/**
 * ChatHistoryService Unit Tests
 * Tests for chat session archival, restoration, and history management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatHistoryService } from './ChatHistoryService';
import type { ChatSession, ChatMessage } from '../types/models';

describe('ChatHistoryService', () => {
  let service: ChatHistoryService;
  let mockChromeStorage: any;

  // Helper function to create a test chat session
  const createTestSession = (messageCount: number = 3): ChatSession => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i === 0 ? 'First user message for testing' : `Message ${i}`,
        timestamp: Date.now() + i * 1000,
      });
    }

    return {
      id: 'session-1',
      messages,
      selectedModel: 'gpt-4',
      toolsEnabled: true,
      createdAt: Date.now(),
    };
  };

  beforeEach(async () => {
    // Get fresh instance
    service = ChatHistoryService.getInstance();
    
    // Reset chrome storage mock
    mockChromeStorage = global.chrome.storage.local;
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockChromeStorage.set.mockImplementation((_data: any, callback: () => void) => {
      callback();
    });
    
    mockChromeStorage.get.mockImplementation((_keys: string[], callback: (result: any) => void) => {
      callback({ chatHistory: [] });
    });
    
    // Clear the service state by loading empty history
    await service.loadHistory();
  });

  describe('generateTitle', () => {
    it('should generate title from first user message', () => {
      const message = 'How to implement user authentication';
      const title = service.generateTitle(message);
      
      expect(title).toBe('How to implement user authentication');
    });

    it('should truncate title at 50 characters with ellipsis', () => {
      const longMessage = 'This is a very long message that exceeds the maximum allowed length for a title';
      const title = service.generateTitle(longMessage);
      
      expect(title.length).toBe(53); // 50 chars + '...'
      expect(title.endsWith('...')).toBe(true);
      expect(title.substring(0, 50)).toBe(longMessage.substring(0, 50));
    });

    it('should normalize whitespace in title', () => {
      const messageWithWhitespace = 'How   to\n\nimple\tment\r\nauth';
      const title = service.generateTitle(messageWithWhitespace);
      
      expect(title).toBe('How to imple ment auth');
      expect(title).not.toContain('\n');
      expect(title).not.toContain('\t');
    });

    it('should handle empty message with timestamp fallback', () => {
      const title = service.generateTitle('');
      
      expect(title).toContain('Chat ');
      expect(title).toMatch(/Chat \d+\/\d+\/\d+/);
    });

    it('should handle whitespace-only message with timestamp fallback', () => {
      const title = service.generateTitle('   \n\t  ');
      
      expect(title).toContain('Chat ');
    });

    it('should handle special characters in title', () => {
      const messageWithSpecialChars = 'Fix bug: @user #123 & $variable';
      const title = service.generateTitle(messageWithSpecialChars);
      
      expect(title).toBe('Fix bug: @user #123 & $variable');
    });
  });

  describe('archiveSession', () => {
    it('should archive a chat session successfully', async () => {
      const session = createTestSession();
      
      const historyId = await service.archiveSession(session);
      
      expect(historyId).toBeDefined();
      expect(typeof historyId).toBe('string');
      expect(mockChromeStorage.set).toHaveBeenCalledTimes(1);
    });

    it('should generate title from first user message', async () => {
      const session = createTestSession();
      
      await service.archiveSession(session);
      const records = await service.getArchivedSessions();
      
      expect(records[0].title).toBe('First user message for testing');
    });

    it('should store correct metadata in history record', async () => {
      const session = createTestSession(5);
      const beforeArchive = Date.now();
      
      await service.archiveSession(session);
      const records = await service.getArchivedSessions();
      
      const record = records[0];
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBe(session.createdAt);
      expect(record.archivedAt).toBeGreaterThanOrEqual(beforeArchive);
      expect(record.messageCount).toBe(5);
      expect(record.session).toEqual(session);
    });

    it('should handle session with no user messages', async () => {
      const session: ChatSession = {
        id: 'session-2',
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello!',
            timestamp: Date.now(),
          },
        ],
        selectedModel: 'gpt-4',
        toolsEnabled: true,
        createdAt: Date.now(),
      };
      
      await service.archiveSession(session);
      const records = await service.getArchivedSessions();
      
      expect(records[0].title).toContain('Chat ');
    });

    it('should create independent copies of sessions', async () => {
      const session = createTestSession();
      const originalMessageCount = session.messages.length;
      
      await service.archiveSession(session);
      
      // Modify original session by pushing to messages array
      session.messages.push({
        id: 'new-msg',
        role: 'user',
        content: 'New message',
        timestamp: Date.now(),
      });
      
      // The archived session should not be affected by modifications to the original
      const records = await service.getArchivedSessions();
      expect(records[0].messageCount).toBe(originalMessageCount);
      expect(records[0].session.messages.length).toBe(originalMessageCount);
    });
  });

  describe('getArchivedSessions', () => {
    it('should return empty array when no sessions archived', async () => {
      const records = await service.getArchivedSessions();
      
      expect(records).toEqual([]);
    });

    it('should return all archived sessions', async () => {
      const session1 = createTestSession();
      const session2 = createTestSession();
      
      await service.archiveSession(session1);
      await service.archiveSession(session2);
      
      const records = await service.getArchivedSessions();
      
      expect(records.length).toBe(2);
    });

    it('should sort sessions by archived date (most recent first)', async () => {
      const session1 = createTestSession();
      const session2 = createTestSession();
      const session3 = createTestSession();
      
      const id1 = await service.archiveSession(session1);
      await new Promise(resolve => setTimeout(resolve, 10));
      const id2 = await service.archiveSession(session2);
      await new Promise(resolve => setTimeout(resolve, 10));
      const id3 = await service.archiveSession(session3);
      
      const records = await service.getArchivedSessions();
      
      expect(records[0].id).toBe(id3);
      expect(records[1].id).toBe(id2);
      expect(records[2].id).toBe(id1);
    });
  });

  describe('restoreSession', () => {
    it('should restore an archived session successfully', async () => {
      const originalSession = createTestSession();
      const historyId = await service.archiveSession(originalSession);
      
      const restoredSession = await service.restoreSession(historyId);
      
      expect(restoredSession).toEqual(originalSession);
    });

    it('should throw error when history record not found', async () => {
      await expect(service.restoreSession('non-existent-id'))
        .rejects
        .toThrow('History record not found: non-existent-id');
    });

    it('should return independent copy of archived session', async () => {
      const session = createTestSession();
      const historyId = await service.archiveSession(session);
      
      const restored = await service.restoreSession(historyId);
      
      // Modify restored session
      restored.messages.push({
        id: 'new-msg',
        role: 'user',
        content: 'New message',
        timestamp: Date.now(),
      });
      
      // Original archived session should be unchanged
      const restoredAgain = await service.restoreSession(historyId);
      expect(restoredAgain.messages.length).toBe(session.messages.length);
    });
  });

  describe('deleteArchivedSession', () => {
    it('should delete an archived session successfully', async () => {
      const session = createTestSession();
      const historyId = await service.archiveSession(session);
      
      await service.deleteArchivedSession(historyId);
      
      const records = await service.getArchivedSessions();
      expect(records.length).toBe(0);
      expect(mockChromeStorage.set).toHaveBeenCalledTimes(2); // Once for archive, once for delete
    });

    it('should throw error when deleting non-existent session', async () => {
      await expect(service.deleteArchivedSession('non-existent-id'))
        .rejects
        .toThrow('History record not found: non-existent-id');
    });

    it('should only delete specified session', async () => {
      const session1 = createTestSession();
      const session2 = createTestSession();
      
      const id1 = await service.archiveSession(session1);
      const id2 = await service.archiveSession(session2);
      
      await service.deleteArchivedSession(id1);
      
      const records = await service.getArchivedSessions();
      expect(records.length).toBe(1);
      expect(records[0].id).toBe(id2);
    });
  });

  describe('saveHistory', () => {
    it('should save history to Chrome storage', async () => {
      const session = createTestSession();
      await service.archiveSession(session);
      
      expect(mockChromeStorage.set).toHaveBeenCalled();
      const callArgs = mockChromeStorage.set.mock.calls[0][0];
      expect(callArgs).toHaveProperty('chatHistory');
      expect(Array.isArray(callArgs.chatHistory)).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.set.mockImplementation((_data: any, callback: () => void) => {
        global.chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        callback();
      });
      
      const session = createTestSession();
      
      await expect(service.archiveSession(session))
        .rejects
        .toThrow('Storage quota exceeded');
      
      // Clean up
      global.chrome.runtime.lastError = undefined;
    });
  });

  describe('loadHistory', () => {
    it('should load history from Chrome storage', async () => {
      const session = createTestSession();
      const historyId = await service.archiveSession(session);
      const records = await service.getArchivedSessions();
      
      // Mock storage to return the saved records
      mockChromeStorage.get.mockImplementation((_keys: string[], callback: (result: any) => void) => {
        callback({ chatHistory: records });
      });
      
      // Create new service instance and load
      const newService = ChatHistoryService.getInstance();
      await newService.loadHistory();
      
      const loadedRecords = await newService.getArchivedSessions();
      expect(loadedRecords.length).toBe(1);
      expect(loadedRecords[0].id).toBe(historyId);
    });

    it('should handle empty storage', async () => {
      mockChromeStorage.get.mockImplementation((_keys: string[], callback: (result: any) => void) => {
        callback({});
      });
      
      await service.loadHistory();
      const records = await service.getArchivedSessions();
      
      expect(records).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.get.mockImplementation((_keys: string[], callback: (result: any) => void) => {
        global.chrome.runtime.lastError = { message: 'Storage access denied' };
        callback({});
      });
      
      await expect(service.loadHistory())
        .rejects
        .toThrow('Storage access denied');
      
      // Clean up
      global.chrome.runtime.lastError = undefined;
    });
  });
});
