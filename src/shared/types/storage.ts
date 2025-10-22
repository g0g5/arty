/**
 * Chrome Storage Schema Types
 * Defines the structure of data stored in chrome.storage.local
 */

import type { ProviderProfile, ChatSession } from './models';

/**
 * App Settings
 * General application settings stored in Chrome storage
 */
export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  defaultProvider?: string;      // Default provider ID
  defaultModel?: string;         // Default model ID
  toolsEnabledByDefault?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;     // Milliseconds
}

/**
 * Storage Schema
 * Complete schema for chrome.storage.local
 */
export interface StorageSchema {
  providers: ProviderProfile[];
  settings: AppSettings;
  chatSessions: ChatSession[];
  lastWorkspacePath?: string;
  version?: number;              // Storage schema version for migrations
}

/**
 * Storage Keys
 * Type-safe keys for Chrome storage access
 */
export type StorageKey = keyof StorageSchema;

/**
 * Storage Change Event
 * Type for chrome.storage.onChanged events
 */
export interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

export type StorageChanges = {
  [K in StorageKey]?: StorageChange<StorageSchema[K]>;
};
