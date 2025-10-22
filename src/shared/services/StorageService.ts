/**
 * Storage Service
 * Handles all Chrome storage operations with encryption for sensitive data
 */

import type { ProviderProfile, ChatSession } from '../types/models';
import type { AppSettings, StorageSchema, StorageKey } from '../types/storage';
import type { IStorageService } from '../types/services';

/**
 * Storage Service Implementation
 * Wraps chrome.storage.local API with encryption for API keys
 */
export class StorageService implements IStorageService {
  private static instance: StorageService;
  private encryptionKey: CryptoKey | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of StorageService
   */
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize encryption key
   * Derives a key from the extension ID for consistent encryption
   */
  private async initEncryptionKey(): Promise<void> {
    if (this.encryptionKey) {
      return;
    }

    // Use extension ID as seed for key derivation
    const extensionId = chrome.runtime.id;
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(extensionId);

    // Import key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive encryption key using PBKDF2
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('arty-extension-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt API key using Web Crypto API
   */
  public async encryptApiKey(key: string): Promise<string> {
    await this.initEncryptionKey();
    
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return this.arrayBufferToBase64(combined);
  }

  /**
   * Decrypt API key using Web Crypto API
   */
  public async decryptApiKey(encrypted: string): Promise<string> {
    await this.initEncryptionKey();
    
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    // Convert from base64
    const combined = this.base64ToArrayBuffer(encrypted);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encryptedData
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Save provider profiles to storage
   */
  public async saveProviders(providers: ProviderProfile[]): Promise<void> {
    await this.setStorageItem('providers', providers);
  }

  /**
   * Get provider profiles from storage
   */
  public async getProviders(): Promise<ProviderProfile[]> {
    const providers = await this.getStorageItem('providers');
    return providers || [];
  }

  /**
   * Save app settings to storage
   */
  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.setStorageItem('settings', settings);
  }

  /**
   * Get app settings from storage
   */
  public async getSettings(): Promise<AppSettings> {
    const settings = await this.getStorageItem('settings');
    return settings || {};
  }

  /**
   * Save chat sessions to storage
   */
  public async saveChatSessions(sessions: ChatSession[]): Promise<void> {
    await this.setStorageItem('chatSessions', sessions);
  }

  /**
   * Get chat sessions from storage
   */
  public async getChatSessions(): Promise<ChatSession[]> {
    const sessions = await this.getStorageItem('chatSessions');
    return sessions || [];
  }

  /**
   * Save last workspace path
   */
  public async saveLastWorkspacePath(path: string): Promise<void> {
    await this.setStorageItem('lastWorkspacePath', path);
  }

  /**
   * Get last workspace path
   */
  public async getLastWorkspacePath(): Promise<string | undefined> {
    return await this.getStorageItem('lastWorkspacePath');
  }

  /**
   * Generic method to get item from storage
   */
  private async getStorageItem<K extends StorageKey>(
    key: K
  ): Promise<StorageSchema[K] | undefined> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  /**
   * Generic method to set item in storage
   */
  private async setStorageItem<K extends StorageKey>(
    key: K,
    value: StorageSchema[K]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clear all storage data
   */
  public async clearAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get all storage data
   */
  public async getAll(): Promise<Partial<StorageSchema>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result as Partial<StorageSchema>);
        }
      });
    });
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Migrate storage schema to new version
   * This method can be extended to handle future schema changes
   */
  public async migrateStorage(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migrating storage from version ${fromVersion} to ${toVersion}`);
    
    // Get all current data
    const currentData = await this.getAll();

    // Apply migrations based on version
    if (fromVersion < 1 && toVersion >= 1) {
      // Example migration: Add default settings if not present
      if (!currentData.settings) {
        await this.saveSettings({
          theme: 'system',
          toolsEnabledByDefault: true,
          autoSave: true,
          autoSaveInterval: 5000
        });
      }
    }

    // Future migrations can be added here
    // if (fromVersion < 2 && toVersion >= 2) { ... }
  }

  /**
   * Get storage version
   */
  public async getStorageVersion(): Promise<number> {
    const version = await this.getStorageItem('version' as StorageKey);
    return (version as number) || 0;
  }

  /**
   * Set storage version
   */
  public async setStorageVersion(version: number): Promise<void> {
    await this.setStorageItem('version' as StorageKey, version as any);
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();
