/**
 * Chat History Service
 * Manages chat session archival, restoration, and history management
 * Provides persistent storage for archived chat sessions
 */

import type { ChatSession } from '../types/models';

/**
 * Chat History Record
 * Represents an archived chat session with metadata
 */
export interface ChatHistoryRecord {
  id: string;                    // UUID for the history record
  title: string;                 // Generated from first user message
  createdAt: number;             // Original session creation timestamp
  archivedAt: number;            // When the session was archived
  messageCount: number;          // Number of messages in the session
  session: ChatSession;          // The complete chat session
}

/**
 * Chat History Service Interface
 */
export interface IChatHistoryService {
  archiveSession(session: ChatSession): Promise<string>;
  getArchivedSessions(): Promise<ChatHistoryRecord[]>;
  restoreSession(historyId: string): Promise<ChatSession>;
  deleteArchivedSession(historyId: string): Promise<void>;
  generateTitle(firstMessage: string): string;
  saveHistory(): Promise<void>;
  loadHistory(): Promise<void>;
}

/**
 * Chat History Service Implementation
 * Manages archived chat sessions with persistent storage
 */
export class ChatHistoryService implements IChatHistoryService {
  private static instance: ChatHistoryService;
  private historyRecords: Map<string, ChatHistoryRecord> = new Map();
  private readonly STORAGE_KEY = 'chatHistory';
  private readonly MAX_TITLE_LENGTH = 50;

  private constructor() {
    // Constructor is private for singleton pattern
    // History loading should be done explicitly via loadHistory()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ChatHistoryService {
    if (!ChatHistoryService.instance) {
      ChatHistoryService.instance = new ChatHistoryService();
    }
    return ChatHistoryService.instance;
  }

  /**
   * Generate a title from the first user message
   * Truncates at 50 characters with ellipsis
   */
  public generateTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.trim().length === 0) {
      return `Chat ${new Date().toLocaleString()}`;
    }

    // Remove special characters and normalize whitespace
    const normalized = firstMessage
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate at 50 characters with ellipsis
    if (normalized.length > this.MAX_TITLE_LENGTH) {
      return normalized.substring(0, this.MAX_TITLE_LENGTH) + '...';
    }

    return normalized;
  }

  /**
   * Archive a chat session
   * Creates a ChatHistoryRecord and stores it
   */
  public async archiveSession(session: ChatSession): Promise<string> {
    // Generate title from first user message
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? this.generateTitle(firstUserMessage.content)
      : this.generateTitle('');

    // Create history record with deep copy of session
    const historyRecord: ChatHistoryRecord = {
      id: crypto.randomUUID(),
      title,
      createdAt: session.createdAt,
      archivedAt: Date.now(),
      messageCount: session.messages.length,
      session: {
        ...session,
        messages: session.messages.map(msg => ({ ...msg })), // Deep copy messages
      },
    };

    // Store in memory
    this.historyRecords.set(historyRecord.id, historyRecord);

    // Persist to storage
    await this.saveHistory();

    return historyRecord.id;
  }

  /**
   * Get all archived sessions
   * Returns sorted by archived date (most recent first)
   */
  public async getArchivedSessions(): Promise<ChatHistoryRecord[]> {
    const records = Array.from(this.historyRecords.values());
    
    // Sort by archived date, most recent first
    return records.sort((a, b) => b.archivedAt - a.archivedAt);
  }

  /**
   * Restore a session from history
   * Returns a copy of the archived session
   */
  public async restoreSession(historyId: string): Promise<ChatSession> {
    const record = this.historyRecords.get(historyId);
    
    if (!record) {
      throw new Error(`History record not found: ${historyId}`);
    }

    // Return a deep copy to avoid modifying the archived session
    return {
      ...record.session,
      messages: record.session.messages.map(msg => ({ ...msg })),
    };
  }

  /**
   * Delete an archived session
   */
  public async deleteArchivedSession(historyId: string): Promise<void> {
    if (!this.historyRecords.has(historyId)) {
      throw new Error(`History record not found: ${historyId}`);
    }

    this.historyRecords.delete(historyId);
    await this.saveHistory();
  }

  /**
   * Save history to Chrome storage
   */
  public async saveHistory(): Promise<void> {
    const records = Array.from(this.historyRecords.values());
    
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: records }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Load history from Chrome storage
   */
  public async loadHistory(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          const records = result[this.STORAGE_KEY] as ChatHistoryRecord[] || [];
          
          // Rebuild the map from stored records
          this.historyRecords.clear();
          records.forEach(record => {
            this.historyRecords.set(record.id, record);
          });
          
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
export const chatHistoryService = ChatHistoryService.getInstance();
