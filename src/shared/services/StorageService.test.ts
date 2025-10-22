/**
 * StorageService Unit Tests
 * Tests for Chrome storage operations and API key encryption/decryption
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from './StorageService';
import type { ProviderProfile, ChatSession } from '../types/models';
import type { AppSettings } from '../types/storage';

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    // Get fresh instance for each test
    storageService = StorageService.getInstance();
    
    // Reset chrome.storage mocks
    vi.clearAllMocks();
    (chrome.runtime as any).lastError = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StorageService.getInstance();
      const instance2 = StorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Provider Operations', () => {
    it('should save providers to chrome.storage', async () => {
      const mockProviders: ProviderProfile[] = [
        {
          id: 'provider-1',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1/',
          apiKey: 'encrypted-key-123',
          models: ['gpt-4', 'gpt-3.5-turbo'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      // Mock chrome.storage.local.set to call callback immediately
      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.saveProviders(mockProviders);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { providers: mockProviders },
        expect.any(Function)
      );
    });

    it('should get providers from chrome.storage', async () => {
      const mockProviders: ProviderProfile[] = [
        {
          id: 'provider-1',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1/',
          apiKey: 'encrypted-key-123',
          models: ['gpt-4'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      // Mock chrome.storage.local.get to return providers
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ providers: mockProviders });
      });

      const result = await storageService.getProviders();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        ['providers'],
        expect.any(Function)
      );
      expect(result).toEqual(mockProviders);
    });

    it('should return empty array when no providers exist', async () => {
      // Mock chrome.storage.local.get to return empty result
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({});
      });

      const result = await storageService.getProviders();

      expect(result).toEqual([]);
    });

    it('should handle storage errors when saving providers', async () => {
      const mockProviders: ProviderProfile[] = [];

      // Mock chrome.storage.local.set to simulate error
      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        (chrome.runtime as any).lastError = { message: 'Storage quota exceeded' };
        if (callback) callback();
      });

      await expect(storageService.saveProviders(mockProviders)).rejects.toThrow(
        'Storage quota exceeded'
      );
    });
  });

  describe('Settings Operations', () => {
    it('should save settings to chrome.storage', async () => {
      const mockSettings: AppSettings = {
        theme: 'dark',
        toolsEnabledByDefault: true,
        autoSave: true,
        autoSaveInterval: 5000,
      };

      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.saveSettings(mockSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { settings: mockSettings },
        expect.any(Function)
      );
    });

    it('should get settings from chrome.storage', async () => {
      const mockSettings: AppSettings = {
        theme: 'light',
        defaultProvider: 'provider-1',
      };

      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ settings: mockSettings });
      });

      const result = await storageService.getSettings();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        ['settings'],
        expect.any(Function)
      );
      expect(result).toEqual(mockSettings);
    });

    it('should return empty object when no settings exist', async () => {
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({});
      });

      const result = await storageService.getSettings();

      expect(result).toEqual({});
    });
  });

  describe('Chat Sessions Operations', () => {
    it('should save chat sessions to chrome.storage', async () => {
      const mockSessions: ChatSession[] = [
        {
          id: 'session-1',
          messages: [],
          selectedModel: 'gpt-4',
          toolsEnabled: true,
          createdAt: Date.now(),
        },
      ];

      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.saveChatSessions(mockSessions);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { chatSessions: mockSessions },
        expect.any(Function)
      );
    });

    it('should get chat sessions from chrome.storage', async () => {
      const mockSessions: ChatSession[] = [
        {
          id: 'session-1',
          messages: [],
          selectedModel: 'gpt-4',
          toolsEnabled: false,
          createdAt: Date.now(),
        },
      ];

      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ chatSessions: mockSessions });
      });

      const result = await storageService.getChatSessions();

      expect(result).toEqual(mockSessions);
    });
  });

  describe('Workspace Path Operations', () => {
    it('should save last workspace path', async () => {
      const mockPath = '/home/user/projects/my-project';

      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.saveLastWorkspacePath(mockPath);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { lastWorkspacePath: mockPath },
        expect.any(Function)
      );
    });

    it('should get last workspace path', async () => {
      const mockPath = '/home/user/projects/my-project';

      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ lastWorkspacePath: mockPath });
      });

      const result = await storageService.getLastWorkspacePath();

      expect(result).toBe(mockPath);
    });
  });

  describe('API Key Encryption/Decryption', () => {
    it('should encrypt and decrypt API key correctly', async () => {
      const originalKey = 'sk-test-api-key-12345';

      // Encrypt the key
      const encrypted = await storageService.encryptApiKey(originalKey);

      // Encrypted key should be different from original
      expect(encrypted).not.toBe(originalKey);
      expect(encrypted).toBeTruthy();

      // Decrypt the key
      const decrypted = await storageService.decryptApiKey(encrypted);

      // Decrypted key should match original
      expect(decrypted).toBe(originalKey);
    });

    it('should produce different encrypted values for same key (due to random IV)', async () => {
      const originalKey = 'sk-test-api-key-12345';

      const encrypted1 = await storageService.encryptApiKey(originalKey);
      const encrypted2 = await storageService.encryptApiKey(originalKey);

      // Different encrypted values due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same original value
      const decrypted1 = await storageService.decryptApiKey(encrypted1);
      const decrypted2 = await storageService.decryptApiKey(encrypted2);

      expect(decrypted1).toBe(originalKey);
      expect(decrypted2).toBe(originalKey);
    });

    it('should handle empty string encryption', async () => {
      const emptyKey = '';

      const encrypted = await storageService.encryptApiKey(emptyKey);
      const decrypted = await storageService.decryptApiKey(encrypted);

      expect(decrypted).toBe(emptyKey);
    });

    it('should handle long API keys', async () => {
      const longKey = 'sk-' + 'a'.repeat(200);

      const encrypted = await storageService.encryptApiKey(longKey);
      const decrypted = await storageService.decryptApiKey(encrypted);

      expect(decrypted).toBe(longKey);
    });

    it('should handle special characters in API keys', async () => {
      const specialKey = 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?';

      const encrypted = await storageService.encryptApiKey(specialKey);
      const decrypted = await storageService.decryptApiKey(encrypted);

      expect(decrypted).toBe(specialKey);
    });
  });

  describe('Storage Utilities', () => {
    it('should clear all storage data', async () => {
      vi.mocked(chrome.storage.local.clear).mockImplementation((callback) => {
        if (callback) callback();
      });

      await storageService.clearAll();

      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });

    it('should get all storage data', async () => {
      const mockData = {
        providers: [],
        settings: { theme: 'dark' },
        chatSessions: [],
      };

      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback(mockData);
      });

      const result = await storageService.getAll();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(null, expect.any(Function));
      expect(result).toEqual(mockData);
    });

    it('should handle errors when clearing storage', async () => {
      vi.mocked(chrome.storage.local.clear).mockImplementation((callback) => {
        (chrome.runtime as any).lastError = { message: 'Clear failed' };
        if (callback) callback();
      });

      await expect(storageService.clearAll()).rejects.toThrow('Clear failed');
    });
  });

  describe('Storage Migration', () => {
    it('should migrate storage from version 0 to 1', async () => {
      // Mock getAll to return empty data
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({});
      });

      // Mock set for saving default settings
      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.migrateStorage(0, 1);

      // Should have saved default settings
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            theme: 'system',
            toolsEnabledByDefault: true,
            autoSave: true,
            autoSaveInterval: 5000,
          }),
        }),
        expect.any(Function)
      );
    });

    it('should not overwrite existing settings during migration', async () => {
      const existingSettings = { theme: 'dark', autoSave: false };

      // Mock getAll to return existing settings
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ settings: existingSettings });
      });

      await storageService.migrateStorage(0, 1);

      // Should not have called set since settings already exist
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('Storage Version', () => {
    it('should get storage version', async () => {
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({ version: 1 });
      });

      const version = await storageService.getStorageVersion();

      expect(version).toBe(1);
    });

    it('should return 0 when no version exists', async () => {
      vi.mocked(chrome.storage.local.get).mockImplementation((_keys, callback) => {
        callback({});
      });

      const version = await storageService.getStorageVersion();

      expect(version).toBe(0);
    });

    it('should set storage version', async () => {
      vi.mocked(chrome.storage.local.set).mockImplementation((_items, callback) => {
        if (callback) callback();
      });

      await storageService.setStorageVersion(2);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { version: 2 },
        expect.any(Function)
      );
    });
  });
});
