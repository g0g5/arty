/**
 * Integration tests for TextEditorPanel component
 * Tests manual save functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEditorPanel } from './TextEditorPanel';
import { fileSystemService } from '../../shared/services/FileSystemService';

// Mock the FileSystemService
vi.mock('../../shared/services/FileSystemService', () => ({
  fileSystemService: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('TextEditorPanel Integration Tests', () => {
  let mockFileHandle: FileSystemFileHandle;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock file handle
    mockFileHandle = {
      kind: 'file',
      name: 'test.md',
      getFile: vi.fn(),
      createWritable: vi.fn(),
    } as unknown as FileSystemFileHandle;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });



  describe('Manual Save Functionality', () => {
    it('should mark content as dirty when edited', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');

      // Initially should not show unsaved changes
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

      // Edit content
      await user.type(textarea, ' modified');

      // Should show unsaved changes indicator
      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      });
    });

    it('should save when save button is clicked', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      vi.mocked(fileSystemService.writeFile).mockResolvedValue(undefined);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Should show unsaved changes
      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      });

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should save
      await waitFor(() => {
        expect(fileSystemService.writeFile).toHaveBeenCalledWith(
          mockFileHandle,
          'Initial content modified'
        );
      });

      // Should clear dirty state
      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('should disable save button when content is not dirty', async () => {
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      // Save button should be disabled when no changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should save immediately on Ctrl+S', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      vi.mocked(fileSystemService.writeFile).mockResolvedValue(undefined);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Press Ctrl+S
      await user.keyboard('{Control>}s{/Control}');

      // Should save immediately
      await waitFor(() => {
        expect(fileSystemService.writeFile).toHaveBeenCalledWith(
          mockFileHandle,
          'Initial content modified'
        );
      });

      // Should clear dirty state
      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('should update last saved timestamp after successful save', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      vi.mocked(fileSystemService.writeFile).mockResolvedValue(undefined);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      expect(screen.getByText(/Last saved:/)).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should update last saved timestamp
      await waitFor(() => {
        expect(fileSystemService.writeFile).toHaveBeenCalled();
      });
      
      expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    });

    it('should display error message when save fails', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      vi.mocked(fileSystemService.writeFile).mockRejectedValue(
        new Error('Permission denied to write file')
      );

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText('Permission denied to write file')).toBeInTheDocument();
      });
    });

    it('should show saving state while save is in progress', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      
      // Create a promise that we can control
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      vi.mocked(fileSystemService.writeFile).mockReturnValue(savePromise);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show saving state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the save
      await act(async () => {
        resolveSave!();
      });

      // Should return to normal state
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('should trigger save on beforeunload when content is dirty', async () => {
      const user = userEvent.setup();
      const mockContent = 'Initial content';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);
      vi.mocked(fileSystemService.writeFile).mockResolvedValue(undefined);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Start typing your content...');
      await user.type(textarea, ' modified');

      // Should show unsaved changes
      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      });

      // Trigger beforeunload event
      const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      window.dispatchEvent(beforeUnloadEvent);

      // Should trigger save
      await waitFor(() => {
        expect(fileSystemService.writeFile).toHaveBeenCalledWith(
          mockFileHandle,
          'Initial content modified'
        );
      });
    });
  });

  describe('File Loading', () => {
    it('should load file content when file handle is provided', async () => {
      const mockContent = '# Test File\n\nContent here.';
      vi.mocked(fileSystemService.readFile).mockResolvedValue(mockContent);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Should call readFile
      expect(fileSystemService.readFile).toHaveBeenCalledWith(mockFileHandle);

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });

      // Should display content
      const textarea = screen.getByPlaceholderText('Start typing your content...');
      expect(textarea).toHaveValue(mockContent);
    });

    it('should display loading state while loading file', async () => {
      const mockContent = 'Test content';
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(fileSystemService.readFile).mockReturnValue(promise);

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Should show loading state
      expect(screen.getByText('Loading file...')).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockContent);
      });

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Start typing your content...')).toBeInTheDocument();
      });
    });

    it('should display error when file loading fails', async () => {
      vi.mocked(fileSystemService.readFile).mockRejectedValue(
        new Error('Failed to load file')
      );

      render(<TextEditorPanel fileHandle={mockFileHandle} filePath="test.md" />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Failed to load file')).toBeInTheDocument();
      });
    });

    it('should display empty state when no file is selected', () => {
      render(<TextEditorPanel fileHandle={null} filePath={null} />);

      // Should show empty state
      expect(screen.getByText('No file selected')).toBeInTheDocument();
      expect(screen.getByText('Select a file from the workspace to start editing')).toBeInTheDocument();
    });
  });
});
