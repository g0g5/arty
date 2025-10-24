/**
 * Document Service
 * Manages document operations and state independently from UI components
 * Follows the same event-driven pattern as ChatSessionManager
 */

import type {
  IDocumentService,
  DocumentState,
  DocumentSnapshot,
  DocumentEvent,
  DocumentEventListener,
  MatchResult
} from '../types/services';
import {
  createServiceError,
  ErrorCode,
  retryWithBackoff,
  type ServiceError
} from '../utils/errorHandling';
import {
  LRUCache,
  optimizeRegexSearch
} from '../utils/performance';

export class DocumentService implements IDocumentService {
  private static instance: DocumentService;
  private currentDocument: DocumentState | null = null;
  private listeners: Set<DocumentEventListener> = new Set();
  private contentCache: LRUCache<string, string> = new LRUCache(50);

  private constructor() { }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  /**
   * Subscribe to document events
   */
  public subscribe(listener: DocumentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: DocumentEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Get current document state
   */
  public getCurrentDocument(): DocumentState | null {
    return this.currentDocument ? { ...this.currentDocument } : null;
  }

  /**
   * Set current document and load its content
   */
  public async setCurrentDocument(handle: FileSystemFileHandle, path: string): Promise<void> {
    try {
      // Check cache first
      let content: string;
      if (this.contentCache.has(path)) {
        content = this.contentCache.get(path)!;
      } else {
        // Read file content with retry
        content = await retryWithBackoff(async () => {
          const file = await handle.getFile();
          return await file.text();
        });

        // Cache the content
        this.contentCache.set(path, content);
      }

      // Create document state
      this.currentDocument = {
        handle,
        path,
        content,
        isDirty: false,
        lastSaved: Date.now(),
        snapshots: []
      };

      // Create initial snapshot
      this.createSnapshot('manual_save');

      this.emit({ type: 'document_loaded', path });
    } catch (error) {
      const serviceError = createServiceError(
        ErrorCode.FILE_READ_ERROR,
        `Failed to load document: ${path}`,
        error,
        true,
        ['Check file permissions', 'Verify the file exists', 'Try selecting the file again']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }
  /**
   * Get current document content
   */
  public getContent(): string {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first', 'Select a file from the workspace']
      );
    }
    return this.currentDocument.content;
  }

  /**
   * Append content to the current document
   */
  public async appendContent(content: string): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Sanitize content
      const sanitizedContent = this.sanitizeContent(content);

      // Validate content size
      const newContent = this.currentDocument.content + sanitizedContent;
      this.validateContent(newContent);

      // Update document content
      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot for tool execution
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      const serviceError = createServiceError(
        ErrorCode.INVALID_CONTENT,
        'Failed to append content',
        error,
        true,
        ['Check content size', 'Verify content format']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Replace content in the current document
   */
  public async replaceContent(target: string, replacement: string): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Sanitize replacement content
      const sanitizedReplacement = this.sanitizeContent(replacement);

      // Perform replacement
      const newContent = this.currentDocument.content.replace(target, sanitizedReplacement);

      if (newContent === this.currentDocument.content) {
        throw createServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Target content not found for replacement',
          { target },
          true,
          ['Verify the target content exists in the document', 'Check for exact match including whitespace']
        );
      }

      // Validate new content size
      this.validateContent(newContent);

      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot for tool execution
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Already a ServiceError, re-throw
        this.emit({
          type: 'error',
          error: (error as ServiceError).message
        });
        throw error;
      }

      const serviceError = createServiceError(
        ErrorCode.INVALID_CONTENT,
        'Failed to replace content',
        error,
        true
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Insert content at a specific position
   */
  public async insertAt(position: number, content: string): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Validate position
      if (position < 0 || position > this.currentDocument.content.length) {
        throw createServiceError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid position: must be between 0 and ${this.currentDocument.content.length}`,
          { position, contentLength: this.currentDocument.content.length },
          false,
          ['Check position value', 'Ensure position is within content bounds']
        );
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(content);

      // Insert content at position
      const newContent = 
        this.currentDocument.content.slice(0, position) + 
        sanitizedContent + 
        this.currentDocument.content.slice(position);

      // Validate content size
      this.validateContent(newContent);

      // Update document content
      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Already a ServiceError, re-throw
        this.emit({
          type: 'error',
          error: (error as ServiceError).message
        });
        throw error;
      }

      const serviceError = createServiceError(
        ErrorCode.INVALID_CONTENT,
        'Failed to insert content',
        error,
        true,
        ['Check position value', 'Verify content format']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Delete content from a specific range
   */
  public async deleteRange(start: number, end: number): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Validate range
      if (start < 0 || end > this.currentDocument.content.length || start > end) {
        throw createServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid range: start must be <= end and within content bounds',
          { start, end, contentLength: this.currentDocument.content.length },
          false,
          ['Check start and end values', 'Ensure range is within content bounds']
        );
      }

      // Delete content in range
      const newContent = 
        this.currentDocument.content.slice(0, start) + 
        this.currentDocument.content.slice(end);

      // Update document content
      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Already a ServiceError, re-throw
        this.emit({
          type: 'error',
          error: (error as ServiceError).message
        });
        throw error;
      }

      const serviceError = createServiceError(
        ErrorCode.INVALID_CONTENT,
        'Failed to delete content',
        error,
        true,
        ['Check range values', 'Ensure range is valid']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Replace content in a specific range
   */
  public async replaceRange(start: number, end: number, replacement: string): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Validate range
      if (start < 0 || end > this.currentDocument.content.length || start > end) {
        throw createServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid range: start must be <= end and within content bounds',
          { start, end, contentLength: this.currentDocument.content.length },
          false,
          ['Check start and end values', 'Ensure range is within content bounds']
        );
      }

      // Sanitize replacement content
      const sanitizedReplacement = this.sanitizeContent(replacement);

      // Replace content in range
      const newContent = 
        this.currentDocument.content.slice(0, start) + 
        sanitizedReplacement + 
        this.currentDocument.content.slice(end);

      // Validate content size
      this.validateContent(newContent);

      // Update document content
      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Already a ServiceError, re-throw
        this.emit({
          type: 'error',
          error: (error as ServiceError).message
        });
        throw error;
      }

      const serviceError = createServiceError(
        ErrorCode.INVALID_CONTENT,
        'Failed to replace content',
        error,
        true,
        ['Check range values', 'Verify replacement content format']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Search content using regex pattern (optimized for large documents)
   */
  public searchContent(pattern: string): MatchResult[] {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Use optimized regex search for better performance on large files
      return optimizeRegexSearch(this.currentDocument.content, pattern, false);
    } catch (error) {
      const serviceError = createServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid regex pattern for search',
        error,
        true,
        ['Check regex syntax', 'Escape special characters']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Sanitize content to prevent issues
   */
  private sanitizeContent(content: string): string {
    // Basic sanitization - remove null bytes and normalize line endings
    return content
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\r\n/g, '\n') // Normalize Windows line endings
      .replace(/\r/g, '\n'); // Normalize Mac line endings
  }

  /**
   * Validate content before operations
   */
  private validateContent(content: string): boolean {
    // Check for reasonable content size (10MB limit)
    if (content.length > 10 * 1024 * 1024) {
      throw createServiceError(
        ErrorCode.DOCUMENT_TOO_LARGE,
        'Content too large (exceeds 10MB limit)',
        { size: content.length },
        false,
        ['Reduce content size', 'Split into multiple files']
      );
    }
    return true;
  }  /**
   * Save document to file system
   */
  public async saveDocument(): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      // Validate content before saving
      this.validateContent(this.currentDocument.content);

      // Save with retry mechanism
      await retryWithBackoff(async () => {
        const writable = await this.currentDocument!.handle.createWritable();
        await writable.write(this.currentDocument!.content);
        await writable.close();
      });

      // Update cache with saved content
      this.contentCache.set(this.currentDocument.path, this.currentDocument.content);

      // Update document state
      this.currentDocument.isDirty = false;
      this.currentDocument.lastSaved = Date.now();

      // Create snapshot for manual save
      this.createSnapshot('manual_save');

      this.emit({ type: 'document_saved', timestamp: this.currentDocument.lastSaved });
    } catch (error) {
      const serviceError = createServiceError(
        ErrorCode.FILE_WRITE_ERROR,
        'Failed to save document',
        error,
        true,
        ['Check file permissions', 'Ensure disk space is available', 'Try saving again']
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Revert document to a specific snapshot
   */
  public async revertToSnapshot(snapshotId: string): Promise<void> {
    if (!this.currentDocument) {
      throw createServiceError(
        ErrorCode.NO_DOCUMENT_LOADED,
        'No document is currently loaded',
        undefined,
        false,
        ['Open a file in the editor first']
      );
    }

    try {
      const snapshot = this.currentDocument.snapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        throw createServiceError(
          ErrorCode.VALIDATION_ERROR,
          'Snapshot not found',
          { snapshotId },
          false,
          ['Check available snapshots', 'Verify snapshot ID']
        );
      }

      // Revert content
      this.currentDocument.content = snapshot.content;
      this.currentDocument.isDirty = true;

      // Create new snapshot for the revert action
      this.createSnapshot('manual_save');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        // Already a ServiceError, re-throw
        this.emit({
          type: 'error',
          error: (error as ServiceError).message
        });
        throw error;
      }

      const serviceError = createServiceError(
        ErrorCode.UNKNOWN_ERROR,
        'Failed to revert to snapshot',
        error,
        true
      );

      this.emit({
        type: 'error',
        error: serviceError.message
      });
      throw serviceError;
    }
  }

  /**
   * Create a snapshot of current document state
   */
  private createSnapshot(triggerEvent: DocumentSnapshot['triggerEvent'], messageId?: string): void {
    if (!this.currentDocument) return;

    const snapshot: DocumentSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: this.currentDocument.content,
      triggerEvent,
      messageId
    };

    this.currentDocument.snapshots.push(snapshot);

    // Keep only last 10 snapshots to prevent memory issues
    if (this.currentDocument.snapshots.length > 10) {
      this.currentDocument.snapshots = this.currentDocument.snapshots.slice(-10);
    }
  }



  /**
   * Get document snapshots
   */
  public getSnapshots(): DocumentSnapshot[] {
    if (!this.currentDocument) {
      return [];
    }
    return [...this.currentDocument.snapshots];
  }

  /**
   * Check if document has unsaved changes
   */
  public isDirty(): boolean {
    return this.currentDocument?.isDirty ?? false;
  }

  /**
   * Get document path
   */
  public getCurrentPath(): string | null {
    return this.currentDocument?.path ?? null;
  }

  /**
   * Clear current document
   */
  public clearDocument(): void {
    this.currentDocument = null;
  }

  /**
   * Clear content cache
   */
  public clearCache(): void {
    this.contentCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.contentCache.size(),
      maxSize: 50
    };
  }
}

export const documentService = DocumentService.getInstance();