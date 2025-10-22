/**
 * ProvidersSettings Integration Tests
 * Tests for provider CRUD operations and form validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProvidersSettings from './ProvidersSettings';
import { storageService } from '../../shared/services/StorageService';
import type { ProviderProfile } from '../../shared/types/models';

// Mock the storage service
vi.mock('../../shared/services/StorageService', () => ({
  storageService: {
    getProviders: vi.fn(),
    saveProviders: vi.fn(),
    encryptApiKey: vi.fn(),
  },
}));

describe('ProvidersSettings Integration Tests', () => {
  const mockProviders: ProviderProfile[] = [
    {
      id: 'provider-1',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'encrypted-key-123',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      createdAt: 1234567890000,
      updatedAt: 1234567890000,
    },
    {
      id: 'provider-2',
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'encrypted-key-456',
      models: ['claude-3-opus', 'claude-3-sonnet'],
      createdAt: 1234567890000,
      updatedAt: 1234567890000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(storageService.getProviders).mockResolvedValue([]);
    vi.mocked(storageService.saveProviders).mockResolvedValue();
    vi.mocked(storageService.encryptApiKey).mockImplementation(async (key) => `encrypted-${key}`);
  });

  describe('Provider List Display', () => {
    it('should display loading state initially', () => {
      vi.mocked(storageService.getProviders).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ProvidersSettings />);

      expect(screen.getByText('Loading providers...')).toBeInTheDocument();
    });

    it('should load and display providers on mount', async () => {
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText('Anthropic')).toBeInTheDocument();
      });

      expect(storageService.getProviders).toHaveBeenCalledTimes(1);
    });

    it('should display empty state when no providers exist', async () => {
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('No providers configured yet.')).toBeInTheDocument();
      });
    });

    it('should display error message when loading fails', async () => {
      vi.mocked(storageService.getProviders).mockRejectedValue(new Error('Storage error'));

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load providers. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Create Provider', () => {
    it('should show form when Add Provider button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      expect(screen.getByText('Add New Provider')).toBeInTheDocument();
      expect(screen.getByLabelText(/Provider Name/)).toBeInTheDocument();
    });

    it('should create new provider with valid data', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Fill in form
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com/v1');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test-key-123');
      await user.type(screen.getByLabelText(/Models/), 'model-1, model-2');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        expect(storageService.encryptApiKey).toHaveBeenCalledWith('sk-test-key-123');
        expect(storageService.saveProviders).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Provider',
              baseUrl: 'https://api.test.com/v1',
              apiKey: 'encrypted-sk-test-key-123',
              models: ['model-1', 'model-2'],
            }),
          ])
        );
      });
    });

    it('should hide form after successful creation', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Fill and submit form
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com/v1');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test-key');
      await user.type(screen.getByLabelText(/Models/), 'model-1');
      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        expect(screen.queryByText('Add New Provider')).not.toBeInTheDocument();
      });
    });
  });

  describe('Update Provider', () => {
    it('should show form with provider data when Edit is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      const providerCards = screen.getAllByRole('button', { name: /Edit/ });
      await user.click(providerCards[0]);

      expect(screen.getByText('Edit Provider')).toBeInTheDocument();
      expect(screen.getByDisplayValue('OpenAI')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
    });

    it('should update existing provider with modified data', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      // Click edit on first provider
      const editButtons = screen.getAllByRole('button', { name: /Edit/ });
      await user.click(editButtons[0]);

      // Modify name
      const nameInput = screen.getByLabelText(/Provider Name/);
      await user.clear(nameInput);
      await user.type(nameInput, 'OpenAI Updated');

      // Submit form
      await user.click(screen.getByRole('button', { name: /Update Provider/ }));

      await waitFor(() => {
        expect(storageService.saveProviders).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'provider-1',
              name: 'OpenAI Updated',
            }),
            expect.objectContaining({
              id: 'provider-2',
              name: 'Anthropic',
            }),
          ])
        );
      });
    });
  });

  describe('Delete Provider', () => {
    it('should delete provider when Delete is clicked and confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this provider?');

      await waitFor(() => {
        expect(storageService.saveProviders).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'provider-2',
            name: 'Anthropic',
          }),
        ]);
      });

      confirmSpy.mockRestore();
    });

    it('should not delete provider when deletion is cancelled', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(storageService.saveProviders).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should display error message when deletion fails', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue(mockProviders);
      vi.mocked(storageService.saveProviders).mockRejectedValue(new Error('Delete failed'));

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/ });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to delete provider. Please try again.')).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      vi.mocked(storageService.getProviders).mockResolvedValue([]);
    });

    it('should show validation error when provider name is empty', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Try to submit without filling name
      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('Provider name is required')).toBeInTheDocument();
      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should show validation error when base URL is empty', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('Base URL is required')).toBeInTheDocument();
      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should show validation error for invalid URL format', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'not-a-valid-url');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('Please enter a valid URL (http:// or https://)')).toBeInTheDocument();
      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should show validation error when API key is empty', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('API key is required')).toBeInTheDocument();
      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should show validation error when models are empty', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test-key');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('At least one model is required')).toBeInTheDocument();
      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Submit empty form to trigger validation
      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      expect(await screen.findByText('Provider name is required')).toBeInTheDocument();

      // Start typing in name field
      await user.type(screen.getByLabelText(/Provider Name/), 'Test');

      // Error should be cleared
      expect(screen.queryByText('Provider name is required')).not.toBeInTheDocument();
    });

    it('should validate all fields before submission', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      // All validation errors should be shown
      await waitFor(() => {
        expect(screen.getByText('Provider name is required')).toBeInTheDocument();
        expect(screen.getByText('Base URL is required')).toBeInTheDocument();
        expect(screen.getByText('API key is required')).toBeInTheDocument();
        expect(screen.getByText('At least one model is required')).toBeInTheDocument();
      });

      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });

    it('should accept valid http and https URLs', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Test with http URL
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'http://localhost:8080/v1');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test');
      await user.type(screen.getByLabelText(/Models/), 'model-1');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        expect(storageService.saveProviders).toHaveBeenCalled();
      });
    });

    it('should parse comma-separated models correctly', async () => {
      const user = userEvent.setup();

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test');
      await user.type(screen.getByLabelText(/Models/), 'model-1, model-2,  model-3  ');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        expect(storageService.saveProviders).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              models: ['model-1', 'model-2', 'model-3'],
            }),
          ])
        );
      });
    });
  });

  describe('Form Cancel', () => {
    it('should hide form when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      expect(screen.getByText('Add New Provider')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Cancel/ }));

      expect(screen.queryByText('Add New Provider')).not.toBeInTheDocument();
      expect(screen.getByText('Add Provider')).toBeInTheDocument();
    });

    it('should not save data when form is cancelled', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Fill in some data
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');

      // Cancel
      await user.click(screen.getByRole('button', { name: /Cancel/ }));

      expect(storageService.saveProviders).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error when save fails', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);
      vi.mocked(storageService.saveProviders).mockRejectedValue(new Error('Save failed'));

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Fill valid data
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test');
      await user.type(screen.getByLabelText(/Models/), 'model-1');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Failed to save provider. Please try again.');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should display error when encryption fails', async () => {
      const user = userEvent.setup();
      vi.mocked(storageService.getProviders).mockResolvedValue([]);
      vi.mocked(storageService.encryptApiKey).mockRejectedValue(new Error('Encryption failed'));

      render(<ProvidersSettings />);

      await waitFor(() => {
        expect(screen.getByText('Add Provider')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Provider'));

      // Fill valid data
      await user.type(screen.getByLabelText(/Provider Name/), 'Test Provider');
      await user.type(screen.getByLabelText(/Base URL/), 'https://api.test.com');
      await user.type(screen.getByLabelText(/API Key/), 'sk-test');
      await user.type(screen.getByLabelText(/Models/), 'model-1');

      await user.click(screen.getByRole('button', { name: /Add Provider/ }));

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Failed to save provider. Please try again.');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
