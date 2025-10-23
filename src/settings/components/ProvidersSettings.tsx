import { useState, useEffect } from 'react';
import type { ProviderProfile } from '../../shared/types/models';
import { storageService } from '../../shared/services';
import ProviderList from './ProviderList';
import ProviderForm from './ProviderForm';

function ProvidersSettings() {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderProfile | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Load providers from storage
  const loadProviders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedProviders = await storageService.getProviders();
      setProviders(loadedProviders);
    } catch (err) {
      console.error('Error loading providers:', err);
      setError('Failed to load providers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add provider button click
  const handleAddProvider = () => {
    setEditingProvider(undefined);
    setShowForm(true);
  };

  // Handle edit provider
  const handleEditProvider = (provider: ProviderProfile) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  // Handle save provider (create or update)
  const handleSaveProvider = async (provider: ProviderProfile) => {
    try {
      setError(null);
      
      // Encrypt API key before saving
      const encryptedApiKey = await storageService.encryptApiKey(provider.apiKey);
      const providerToSave = { ...provider, apiKey: encryptedApiKey };

      // Update or add provider
      const updatedProviders = editingProvider
        ? providers.map(p => p.id === provider.id ? providerToSave : p)
        : [...providers, providerToSave];

      // Save to storage
      await storageService.saveProviders(updatedProviders);
      
      // Update local state
      setProviders(updatedProviders);
      setShowForm(false);
      setEditingProvider(undefined);
    } catch (err) {
      console.error('Error saving provider:', err);
      setError('Failed to save provider. Please try again.');
      throw err; // Re-throw to let form handle it
    }
  };

  // Handle delete provider
  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) {
      return;
    }

    try {
      setError(null);
      const updatedProviders = providers.filter(p => p.id !== providerId);
      await storageService.saveProviders(updatedProviders);
      setProviders(updatedProviders);
    } catch (err) {
      console.error('Error deleting provider:', err);
      setError('Failed to delete provider. Please try again.');
    }
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProvider(undefined);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Providers</h1>
        {!showForm && (
          <button
            onClick={handleAddProvider}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Provider
          </button>
        )}
      </div>
      
      <p className="text-gray-600 mb-6">
        Configure LLM providers for the agentic editor
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading providers...</p>
        </div>
      ) : showForm ? (
        <ProviderForm
          provider={editingProvider}
          onSave={handleSaveProvider}
          onCancel={handleCancelForm}
        />
      ) : (
        <ProviderList
          providers={providers}
          onEdit={handleEditProvider}
          onDelete={handleDeleteProvider}
        />
      )}
    </div>
  );
}

export default ProvidersSettings;
