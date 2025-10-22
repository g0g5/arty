/**
 * Storage Helper Utilities
 * Helper functions for common storage operations
 */

import { storageService } from '../services';
import type { ProviderProfile } from '../types/models';

/**
 * Add a new provider profile
 */
export async function addProvider(profile: Omit<ProviderProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderProfile> {
  const providers = await storageService.getProviders();
  
  // Encrypt API key before storing
  const encryptedApiKey = await storageService.encryptApiKey(profile.apiKey);
  
  const newProvider: ProviderProfile = {
    ...profile,
    id: crypto.randomUUID(),
    apiKey: encryptedApiKey,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await storageService.saveProviders([...providers, newProvider]);
  return newProvider;
}

/**
 * Update an existing provider profile
 */
export async function updateProvider(id: string, updates: Partial<Omit<ProviderProfile, 'id' | 'createdAt'>>): Promise<ProviderProfile | null> {
  const providers = await storageService.getProviders();
  const index = providers.findIndex(p => p.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // Encrypt API key if it's being updated
  let encryptedApiKey = providers[index].apiKey;
  if (updates.apiKey) {
    encryptedApiKey = await storageService.encryptApiKey(updates.apiKey);
  }
  
  const updatedProvider: ProviderProfile = {
    ...providers[index],
    ...updates,
    apiKey: encryptedApiKey,
    updatedAt: Date.now()
  };
  
  providers[index] = updatedProvider;
  await storageService.saveProviders(providers);
  return updatedProvider;
}

/**
 * Delete a provider profile
 */
export async function deleteProvider(id: string): Promise<boolean> {
  const providers = await storageService.getProviders();
  const filtered = providers.filter(p => p.id !== id);
  
  if (filtered.length === providers.length) {
    return false; // Provider not found
  }
  
  await storageService.saveProviders(filtered);
  return true;
}

/**
 * Get a provider with decrypted API key
 */
export async function getProviderWithDecryptedKey(id: string): Promise<ProviderProfile | null> {
  const providers = await storageService.getProviders();
  const provider = providers.find(p => p.id === id);
  
  if (!provider) {
    return null;
  }
  
  // Decrypt API key
  const decryptedApiKey = await storageService.decryptApiKey(provider.apiKey);
  
  return {
    ...provider,
    apiKey: decryptedApiKey
  };
}

/**
 * Mask API key for display (show only last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '****';
  }
  return '****' + apiKey.slice(-4);
}

/**
 * Initialize default settings if not present
 */
export async function initializeDefaultSettings(): Promise<void> {
  const settings = await storageService.getSettings();
  
  if (Object.keys(settings).length === 0) {
    await storageService.saveSettings({
      theme: 'system',
      toolsEnabledByDefault: true,
      autoSave: true,
      autoSaveInterval: 5000
    });
  }
}
