/**
 * Text Editor Panel Component
 * Main panel for editing files with plain text support and manual save
 * Refactored to use DocumentService for all document operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { documentService } from '../../shared/services';
import type { DocumentEvent } from '../../shared/services';

interface CursorState {
  start: number;
  end: number;
}

interface TextEditorPanelProps {
  fileHandle: FileSystemFileHandle | null;
  filePath: string | null;
}

export function TextEditorPanel({ fileHandle, filePath }: TextEditorPanelProps) {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [cursorPosition, setCursorPosition] = useState<CursorState>({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          setLastSaved(new Date(event.timestamp));
          break;

        case 'error':
          setError(event.error);
          setIsLoading(false);
          setIsSaving(false);
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
        setError(errorMessage);
        console.error('Error loading file:', err);
        setIsLoading(false);
      }
    };

    loadFile();
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

  // Capture cursor position before content changes
  const handleBeforeInput = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      });
    }
  }, []);

  // Handle content changes - update DocumentService
  const handleContentChange = useCallback(async (newContent: string) => {
    try {
      // Get current content from DocumentService
      const currentContent = documentService.getContent();
      const { start, end } = cursorPosition;
      
      // Validate cursor position before proceeding
      if (start < 0 || end < 0 || start > currentContent.length || end > currentContent.length) {
        console.error('Invalid cursor position:', { start, end, contentLength: currentContent.length });
        // Fallback to local state update
        setContent(newContent);
        setError('Cursor position error - content updated locally');
        return;
      }
      
      // Determine the type of change based on content length and cursor position
      if (newContent.length > currentContent.length) {
        // Content was inserted
        const lengthDiff = newContent.length - currentContent.length;
        const insertedContent = newContent.slice(start, start + lengthDiff);
        
        try {
          await documentService.insertAt(start, insertedContent);
          
          // Update cursor position for restoration (after inserted content)
          setCursorPosition({ 
            start: start + lengthDiff, 
            end: start + lengthDiff 
          });
        } catch (err) {
          console.error('Error inserting content at position:', { start, insertedContent, error: err });
          // Fallback to local state update
          setContent(newContent);
          const errorMessage = err instanceof Error ? err.message : 'Failed to insert content';
          setError(errorMessage);
        }
      } else if (newContent.length < currentContent.length) {
        // Content was deleted
        const lengthDiff = currentContent.length - newContent.length;
        
        try {
          // If there was a selection, delete the selected range
          if (start !== end) {
            await documentService.deleteRange(start, end);
            // Update cursor position for restoration (at deletion point)
            setCursorPosition({ start, end: start });
          } else {
            // Single character deletion (backspace or delete key)
            // Backspace deletes before cursor, delete key deletes after cursor
            // We need to determine which by checking if content before cursor changed
            const contentBefore = currentContent.slice(0, start);
            const newContentBefore = newContent.slice(0, start);
            
            if (contentBefore !== newContentBefore) {
              // Backspace: content before cursor changed
              await documentService.deleteRange(start - lengthDiff, start);
              setCursorPosition({ start: start - lengthDiff, end: start - lengthDiff });
            } else {
              // Delete key: content after cursor changed
              await documentService.deleteRange(start, start + lengthDiff);
              setCursorPosition({ start, end: start });
            }
          }
        } catch (err) {
          console.error('Error deleting content range:', { start, end, lengthDiff, error: err });
          // Fallback to local state update
          setContent(newContent);
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete content';
          setError(errorMessage);
        }
      } else if (start !== end) {
        // Selection was replaced with content of same length
        const replacementContent = newContent.slice(start, end);
        
        try {
          await documentService.replaceRange(start, end, replacementContent);
          
          // Update cursor position for restoration (after replacement content)
          setCursorPosition({ 
            start: start + replacementContent.length, 
            end: start + replacementContent.length 
          });
        } catch (err) {
          console.error('Error replacing content range:', { start, end, replacementContent, error: err });
          // Fallback to local state update
          setContent(newContent);
          const errorMessage = err instanceof Error ? err.message : 'Failed to replace content';
          setError(errorMessage);
        }
      } else {
        // Content length is the same and no selection - might be a character replacement
        // Find the position where content differs
        let diffStart = 0;
        while (diffStart < currentContent.length && currentContent[diffStart] === newContent[diffStart]) {
          diffStart++;
        }
        
        if (diffStart < currentContent.length) {
          try {
            // Found a difference - replace single character
            await documentService.replaceRange(diffStart, diffStart + 1, newContent[diffStart]);
            setCursorPosition({ start: diffStart + 1, end: diffStart + 1 });
          } catch (err) {
            console.error('Error replacing character:', { diffStart, character: newContent[diffStart], error: err });
            // Fallback to local state update
            setContent(newContent);
            const errorMessage = err instanceof Error ? err.message : 'Failed to replace character';
            setError(errorMessage);
          }
        }
      }
    } catch (err) {
      // Catch-all for any unexpected errors during content change calculation
      console.error('Unexpected error in handleContentChange:', err);
      // Fallback to local state update to ensure user can continue editing
      setContent(newContent);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    }
  }, [cursorPosition]);

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

  // Restore cursor position after content updates
  useEffect(() => {
    if (textareaRef.current) {
      // Restore the cursor position to maintain editing flow
      textareaRef.current.setSelectionRange(cursorPosition.start, cursorPosition.end);
    }
  }, [content, cursorPosition]);



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
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onBeforeInput={handleBeforeInput}
          className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-white"
          placeholder="Start typing your content..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
