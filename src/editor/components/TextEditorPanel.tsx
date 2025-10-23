/**
 * Text Editor Panel Component
 * Main panel for editing files with plain text support and manual save
 * Refactored to use DocumentService for all document operations
 */

import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../../shared/services/DocumentService';
import type { DocumentEvent } from '../../shared/types/services';

interface TextEditorPanelProps {
  fileHandle: FileSystemFileHandle | null;
  filePath: string | null;
}

export function TextEditorPanel({ fileHandle, filePath }: TextEditorPanelProps) {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Subscribe to DocumentService events
  useEffect(() => {
    const handleDocumentEvent = (event: DocumentEvent) => {
      switch (event.type) {
        case 'document_loaded':
          setIsLoading(false);
          setContent(documentService.getContent());
          setIsDirty(false);
          setError(null);
          const docState = documentService.getCurrentDocument();
          if (docState) {
            setLastSaved(new Date(docState.lastSaved));
          }
          break;

        case 'content_changed':
          setContent(event.content);
          setIsDirty(documentService.isDirty());
          break;

        case 'document_saved':
          setIsDirty(false);
          setIsSaving(false);
          setIsAutoSaving(false);
          setLastSaved(new Date(event.timestamp));
          break;

        case 'error':
          setError(event.error);
          setIsLoading(false);
          setIsSaving(false);
          setIsAutoSaving(false);
          break;
      }
    };

    const unsubscribe = documentService.subscribe(handleDocumentEvent);
    return unsubscribe;
  }, []);

  // Load file when file handle changes
  useEffect(() => {
    const loadFile = async () => {
      if (!fileHandle || !filePath) {
        setContent('');
        setIsDirty(false);
        setError(null);
        setLastSaved(null);
        documentService.clearDocument();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await documentService.setCurrentDocument(fileHandle, filePath);
        // Enable auto-save with 30 second interval
        documentService.enableAutoSave(30000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
        setError(errorMessage);
        console.error('Error loading file:', err);
        setIsLoading(false);
      }
    };

    loadFile();

    // Cleanup: disable auto-save when component unmounts or file changes
    return () => {
      documentService.disableAutoSave();
    };
  }, [fileHandle, filePath]);

  // Manual save functionality
  const saveFile = useCallback(async () => {
    if (!isDirty) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await documentService.saveDocument();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setError(errorMessage);
      console.error('Error saving file:', err);
      setIsSaving(false);
    }
  }, [isDirty]);

  // Handle content changes - update DocumentService
  const handleContentChange = useCallback(async (newContent: string) => {
    try {
      // Get current content from DocumentService
      const currentContent = documentService.getContent();
      
      // Calculate the difference and update accordingly
      if (newContent.length > currentContent.length) {
        // Content was added
        const addedContent = newContent.slice(currentContent.length);
        await documentService.appendContent(addedContent);
      } else {
        // Content was modified or removed - use replace
        await documentService.replaceContent(currentContent, newContent);
      }
    } catch (err) {
      // If no document is loaded, just update local state
      setContent(newContent);
      console.error('Error updating content:', err);
    }
  }, []);

  // Keyboard shortcut for save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  // Save on beforeunload (navigating away from page)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        // Trigger save operation
        saveFile();
        // Show browser confirmation dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saveFile]);

  // Monitor auto-save status
  useEffect(() => {
    // Check if we're in an auto-save state
    const checkAutoSave = () => {
      if (isDirty && !isSaving) {
        setIsAutoSaving(true);
      } else {
        setIsAutoSaving(false);
      }
    };

    const interval = setInterval(checkAutoSave, 1000);
    return () => clearInterval(interval);
  }, [isDirty, isSaving]);

  if (!fileHandle) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">No file selected</p>
          <p className="text-sm mt-1">Select a file from the workspace to start editing</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-mono text-gray-700" title={filePath || undefined}>
            {filePath}
          </span>
          {error && (
            <span className="text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          {lastSaved && (
            <span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <span>
            {content.length} characters
          </span>
        </div>
      </div>

      {/* Plain Text Editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Plain Text Editor</span>
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Auto-save enabled
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Dirty State Indicator */}
            {isDirty && (
              <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="4" />
                </svg>
                Unsaved changes
              </span>
            )}
            {/* Save Button */}
            <button
              onClick={saveFile}
              disabled={!isDirty || isSaving}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title="Save file (Ctrl+S / Cmd+S)"
            >
              {isSaving ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Plain Text Editor */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-white"
          placeholder="Start typing your content..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
