import { useState, useEffect } from 'react';
import type { ProviderFormProps } from '../../shared/types/components';
import type { ProviderProfile } from '../../shared/types/models';

/**
 * ProviderForm Component
 * Form for creating or editing provider profiles
 */
function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    models: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with provider data if editing
  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        models: provider.models.join(', '),
      });
    }
  }, [provider]);

  // Validate URL format
  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Provider name is required';
    }

    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required';
    } else if (!validateUrl(formData.baseUrl.trim())) {
      newErrors.baseUrl = 'Please enter a valid URL (http:// or https://)';
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (!formData.models.trim()) {
      newErrors.models = 'At least one model is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse models from comma-separated string
      const modelsList = formData.models
        .split(',')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const now = Date.now();
      const providerData: ProviderProfile = {
        id: provider?.id || crypto.randomUUID(),
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey.trim(),
        models: modelsList,
        createdAt: provider?.createdAt || now,
        updatedAt: now,
      };

      await onSave(providerData);
    } catch (error) {
      console.error('Error saving provider:', error);
      setErrors({ submit: 'Failed to save provider. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        {provider ? 'Edit Provider' : 'Add New Provider'}
      </h2>

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {errors.submit}
        </div>
      )}

      <div className="space-y-4">
        {/* Provider Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Provider Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., OpenAI, Anthropic"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Base URL */}
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Base URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="baseUrl"
            value={formData.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.baseUrl ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://api.openai.com/v1"
            disabled={isSubmitting}
          />
          {errors.baseUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.baseUrl}</p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="apiKey"
            value={formData.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.apiKey ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="sk-..."
            disabled={isSubmitting}
          />
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Your API key will be encrypted before storage
          </p>
        </div>

        {/* Models */}
        <div>
          <label htmlFor="models" className="block text-sm font-medium text-gray-700 mb-1">
            Models <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="models"
            value={formData.models}
            onChange={(e) => handleChange('models', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.models ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="gpt-4, gpt-3.5-turbo"
            disabled={isSubmitting}
          />
          {errors.models && (
            <p className="mt-1 text-sm text-red-600">{errors.models}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter model IDs separated by commas
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : provider ? 'Update Provider' : 'Add Provider'}
        </button>
      </div>
    </form>
  );
}

export default ProviderForm;
