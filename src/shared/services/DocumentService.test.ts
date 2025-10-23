/**
 * DocumentService Unit Tests
 * Tests document state management and event emission
 * Tests content operations (append, replace, search)
 * Tests auto-save functionality and snapshot system
 * Tests error handling for file system operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentService } from './DocumentService';

describe('DocumentService', () => {
  let service: DocumentService;
  let mockFileHandle: FileSystemFileHandle;
  let mockFile: File;
  let mockWritable: FileSystemWritableFileStream;

  beforeEach(() => {
    service = DocumentService.getInstance();
    
    // Clear any existing document state
    service.clearDocument();
    
    // Mock File object
    mockFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
      lastModified: Date.now()
    });

    // Mock FileSystemWritableFileStream
    mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Mock FileSystemFileHandle
    mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      name: 'test.txt',
      kind: 'file'
    } as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    service.disableAutoSave();
    service.clearDocument();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DocumentService.getInstance();
      const instance2 = DocumentService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Document State Management', () => {
    it('should return null when no document is loaded', () => {
      const currentDoc = service.getCurrentDocument();
      expect(currentDoc).toBeNull();
    });

    it('should load document and emit document_loaded event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');

      const currentDoc = service.getCurrentDocument();
      expect(currentDoc).not.toBeNull();
      expect(currentDoc?.path).toBe('/test/test.txt');
      expect(currentDoc?.content).toBe('test content');
      expect(currentDoc?.isDirty).toBe(false);
      expect(currentDoc?.snapshots).toHaveLength(1);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'document_loaded',
        path: '/test/test.txt'
      });
    });

    it('should handle file loading errors and emit error event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      const errorHandle = {
        ...mockFileHandle,
        getFile: vi.fn().mockRejectedValue(new Error('File access denied'))
      };

      await expect(service.setCurrentDocument(errorHandle, '/test/error.txt'))
        .rejects.toThrow('Failed to load document');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining('Failed to load document')
      });
    });

    it('should clear document state', () => {
      service.clearDocument();
      expect(service.getCurrentDocument()).toBeNull();
      expect(service.getCurrentPath()).toBeNull();
      expect(service.isDirty()).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should subscribe and unsubscribe event listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = service.subscribe(listener1);
      const unsubscribe2 = service.subscribe(listener2);

      // Both listeners should be called
      service['emit']({ type: 'error', error: 'test error' });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Unsubscribe first listener
      unsubscribe1();
      service['emit']({ type: 'error', error: 'test error 2' });
      expect(listener1).toHaveBeenCalledTimes(1); // Still 1
      expect(listener2).toHaveBeenCalledTimes(2); // Now 2

      // Unsubscribe second listener
      unsubscribe2();
      service['emit']({ type: 'error', error: 'test error 3' });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Operations', () => {
    beforeEach(async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
    });

    it('should get current document content', () => {
      const content = service.getContent();
      expect(content).toBe('test content');
    });

    it('should throw error when getting content with no document loaded', () => {
      service.clearDocument();
      expect(() => service.getContent()).toThrow('No document is currently loaded');
    });

    it('should append content and emit content_changed event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      await service.appendContent('\nappended text');

      const content = service.getContent();
      expect(content).toBe('test content\nappended text');
      expect(service.isDirty()).toBe(true);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'content_changed',
        content: 'test content\nappended text'
      });
    });

    it('should sanitize content when appending', async () => {
      await service.appendContent('\r\nWindows\r\nLine\nEndings\0null');

      const content = service.getContent();
      expect(content).toBe('test content\nWindows\nLine\nEndingsnull');
    });

    it('should throw error when appending with no document loaded', async () => {
      service.clearDocument();
      await expect(service.appendContent('test')).rejects.toThrow('No document is currently loaded');
    });

    it('should replace content and emit content_changed event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      await service.replaceContent('test', 'replaced');

      const content = service.getContent();
      expect(content).toBe('replaced content');
      expect(service.isDirty()).toBe(true);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'content_changed',
        content: 'replaced content'
      });
    });

    it('should throw error when target not found for replacement', async () => {
      await expect(service.replaceContent('nonexistent', 'replacement'))
        .rejects.toThrow('Target content not found for replacement');
    });

    it('should throw error when replacing with no document loaded', async () => {
      service.clearDocument();
      await expect(service.replaceContent('test', 'replacement'))
        .rejects.toThrow('No document is currently loaded');
    });

    it('should search content with regex pattern', () => {
      const results = service.searchContent('test');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        line: 1,
        column: 1,
        match: 'test',
        context: 'test content'
      });
    });

    it('should return empty results when pattern not found', () => {
      const results = service.searchContent('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should handle multiline search patterns', async () => {
      await service.replaceContent('test content', 'line 1\ntest content\nline 3');
      
      const results = service.searchContent('test');
      expect(results).toHaveLength(1);
      expect(results[0].line).toBe(2);
      expect(results[0].context).toBe('test content');
    });

    it('should throw error when searching with no document loaded', () => {
      service.clearDocument();
      expect(() => service.searchContent('test')).toThrow('No document is currently loaded');
    });
  });

  describe('Document Persistence', () => {
    beforeEach(async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      await service.appendContent('\nmodified');
    });

    it('should save document and emit document_saved event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      await service.saveDocument();

      expect(mockWritable.write).toHaveBeenCalledWith('test content\nmodified');
      expect(mockWritable.close).toHaveBeenCalled();
      expect(service.isDirty()).toBe(false);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'document_saved',
        timestamp: expect.any(Number)
      });
    });

    it('should handle save errors and emit error event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      mockWritable.write = vi.fn().mockRejectedValue(new Error('Write failed'));

      await expect(service.saveDocument()).rejects.toThrow('Failed to save document');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: 'Failed to save document'
      });
    });

    it('should throw error when saving with no document loaded', async () => {
      service.clearDocument();
      await expect(service.saveDocument()).rejects.toThrow('No document is currently loaded');
    });

    it('should validate content size before saving', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      // Create content larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      
      // This should throw during replaceContent, not saveDocument
      await expect(service.replaceContent('test content\nmodified', largeContent))
        .rejects.toThrow('Content too large (exceeds 10MB limit)');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining('Content too large')
      });
    });
  });

  describe('Snapshot System', () => {
    beforeEach(async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
    });

    it('should create snapshots on content changes', async () => {
      await service.appendContent('\nchange 1');
      await service.appendContent('\nchange 2');

      const snapshots = service.getSnapshots();
      expect(snapshots).toHaveLength(3); // Initial + 2 changes
      expect(snapshots[0].triggerEvent).toBe('manual_save'); // Initial
      expect(snapshots[1].triggerEvent).toBe('tool_execution');
      expect(snapshots[2].triggerEvent).toBe('tool_execution');
    });

    it('should limit snapshots to 10 entries', async () => {
      // Create 15 changes to test limit
      for (let i = 0; i < 15; i++) {
        await service.appendContent(`\nchange ${i}`);
      }

      const snapshots = service.getSnapshots();
      expect(snapshots).toHaveLength(10);
    });

    it('should revert to snapshot and emit content_changed event', async () => {
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      // Get initial snapshot before making changes
      const initialSnapshots = service.getSnapshots();
      const initialSnapshotId = initialSnapshots[0].id;
      const initialContent = initialSnapshots[0].content;

      await service.appendContent('\nchange 1');
      
      // Verify content changed
      expect(service.getContent()).toBe(initialContent + '\nchange 1');

      await service.revertToSnapshot(initialSnapshotId);

      const content = service.getContent();
      expect(content).toBe(initialContent);
      expect(service.isDirty()).toBe(true);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'content_changed',
        content: initialContent
      });
    });

    it('should throw error when reverting to nonexistent snapshot', async () => {
      await expect(service.revertToSnapshot('nonexistent-id'))
        .rejects.toThrow('Snapshot not found');
    });

    it('should throw error when reverting with no document loaded', async () => {
      service.clearDocument();
      await expect(service.revertToSnapshot('any-id'))
        .rejects.toThrow('No document is currently loaded');
    });

    it('should return empty snapshots when no document loaded', () => {
      service.clearDocument();
      const snapshots = service.getSnapshots();
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
    });

    it.skip('should enable auto-save with custom interval', async () => {
      vi.useFakeTimers();
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      service.enableAutoSave(1000); // 1 second
      await service.appendContent('\nmodified');

      // Advance time in steps to trigger interval and debounce
      await vi.advanceTimersByTimeAsync(1000); // Trigger interval
      await vi.advanceTimersByTimeAsync(2000); // Trigger debounce
      await vi.runAllTimersAsync(); // Run any remaining timers

      expect(mockWritable.write).toHaveBeenCalledWith('test content\nmodified');
      expect(service.isDirty()).toBe(false);

      expect(eventListener).toHaveBeenCalledWith({
        type: 'document_saved',
        timestamp: expect.any(Number)
      });

      vi.useRealTimers();
    });

    it('should not auto-save when document is not dirty', async () => {
      vi.useFakeTimers();

      service.enableAutoSave(1000);
      
      // Fast-forward time without making changes
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockWritable.write).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should disable auto-save', async () => {
      vi.useFakeTimers();

      service.enableAutoSave(1000);
      await service.appendContent('\nmodified');
      
      service.disableAutoSave();
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(mockWritable.write).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it.skip('should handle auto-save errors gracefully', async () => {
      vi.useFakeTimers();
      const eventListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      service.subscribe(eventListener);

      mockWritable.write = vi.fn().mockRejectedValue(new Error('Auto-save failed'));

      service.enableAutoSave(1000);
      await service.appendContent('\nmodified');

      // Advance time in steps to trigger interval and debounce
      await vi.advanceTimersByTimeAsync(1000); // Trigger interval
      await vi.advanceTimersByTimeAsync(2000); // Trigger debounce
      await vi.runAllTimersAsync(); // Run any remaining timers

      expect(consoleSpy).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));
      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: expect.stringContaining('Auto-save failed')
      });

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should clear existing interval when enabling auto-save again', async () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      service.enableAutoSave(1000);
      service.enableAutoSave(2000); // Should clear previous interval

      expect(clearIntervalSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Utility Methods', () => {
    it('should return correct dirty state', async () => {
      expect(service.isDirty()).toBe(false);

      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      expect(service.isDirty()).toBe(false);

      await service.appendContent('\nmodified');
      expect(service.isDirty()).toBe(true);

      await service.saveDocument();
      expect(service.isDirty()).toBe(false);
    });

    it('should return current document path', async () => {
      expect(service.getCurrentPath()).toBeNull();

      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      expect(service.getCurrentPath()).toBe('/test/test.txt');

      service.clearDocument();
      expect(service.getCurrentPath()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle content operations errors gracefully', async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      // Mock content validation to throw error
      vi.spyOn(service as any, 'sanitizeContent').mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      await expect(service.appendContent('test')).rejects.toThrow('Failed to append content');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: 'Failed to append content'
      });
    });

    it('should handle search errors gracefully', async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      // Invalid regex pattern
      expect(() => service.searchContent('[')).toThrow();

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: 'Invalid regex pattern for search'
      });
    });

    it('should handle snapshot revert errors gracefully', async () => {
      await service.setCurrentDocument(mockFileHandle, '/test/test.txt');
      const eventListener = vi.fn();
      service.subscribe(eventListener);

      await expect(service.revertToSnapshot('invalid-id')).rejects.toThrow('Snapshot not found');

      expect(eventListener).toHaveBeenCalledWith({
        type: 'error',
        error: 'Snapshot not found'
      });
    });
  });
});