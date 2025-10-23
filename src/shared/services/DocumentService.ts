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

export class DocumentService implements IDocumentService {
  private static instance: DocumentService;
  private currentDocument: DocumentState | null = null;
  private listeners: Set<DocumentEventListener> = new Set();
  private autoSaveInterval: NodeJS.Timeout | null = null;

  private constructor() {}

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
      // Read file content
      const file = await handle.getFile();
      const content = await file.text();

      // Create document state
      this.currentDocument = {
        handle,
        path,
        content,
        isDirty: false,
        lastSaved: file.lastModified,
        snapshots: []
      };

      // Create initial snapshot
      this.createSnapshot('manual_save');

      this.emit({ type: 'document_loaded', path });
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to load document'
      });
      throw error;
    }
  } 
 /**
   * Get current document content
   */
  public getContent(): string {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }
    return this.currentDocument.content;
  }

  /**
   * Append content to the current document
   */
  public async appendContent(content: string): Promise<void> {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }

    try {
      // Sanitize content
      const sanitizedContent = this.sanitizeContent(content);
      
      // Update document content
      this.currentDocument.content += sanitizedContent;
      this.currentDocument.isDirty = true;

      // Create snapshot for tool execution
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to append content'
      });
      throw error;
    }
  }

  /**
   * Replace content in the current document
   */
  public async replaceContent(target: string, replacement: string): Promise<void> {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }

    try {
      // Sanitize replacement content
      const sanitizedReplacement = this.sanitizeContent(replacement);
      
      // Perform replacement
      const newContent = this.currentDocument.content.replace(target, sanitizedReplacement);
      
      if (newContent === this.currentDocument.content) {
        throw new Error('Target content not found for replacement');
      }

      this.currentDocument.content = newContent;
      this.currentDocument.isDirty = true;

      // Create snapshot for tool execution
      this.createSnapshot('tool_execution');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to replace content'
      });
      throw error;
    }
  }

  /**
   * Search content using regex pattern
   */
  public searchContent(pattern: string): MatchResult[] {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }

    try {
      const results: MatchResult[] = [];
      const lines = this.currentDocument.content.split('\n');
      const regex = new RegExp(pattern, 'gi');

      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          results.push({
            line: lineIndex + 1,
            column: match.index + 1,
            match: match[0],
            context: line
          });
        }
      });

      return results;
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to search content'
      });
      throw error;
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
      throw new Error('Content too large (exceeds 10MB limit)');
    }
    return true;
  }  /*
*
   * Save document to file system
   */
  public async saveDocument(): Promise<void> {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }

    try {
      // Validate content before saving
      this.validateContent(this.currentDocument.content);

      // Create writable stream and write content
      const writable = await this.currentDocument.handle.createWritable();
      await writable.write(this.currentDocument.content);
      await writable.close();

      // Update document state
      this.currentDocument.isDirty = false;
      this.currentDocument.lastSaved = Date.now();

      // Create snapshot for manual save
      this.createSnapshot('manual_save');

      this.emit({ type: 'document_saved', timestamp: this.currentDocument.lastSaved });
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to save document'
      });
      throw error;
    }
  }

  /**
   * Revert document to a specific snapshot
   */
  public async revertToSnapshot(snapshotId: string): Promise<void> {
    if (!this.currentDocument) {
      throw new Error('No document is currently loaded');
    }

    try {
      const snapshot = this.currentDocument.snapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        throw new Error('Snapshot not found');
      }

      // Revert content
      this.currentDocument.content = snapshot.content;
      this.currentDocument.isDirty = true;

      // Create new snapshot for the revert action
      this.createSnapshot('manual_save');

      this.emit({ type: 'content_changed', content: this.currentDocument.content });
    } catch (error) {
      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to revert to snapshot'
      });
      throw error;
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
   * Enable auto-save functionality
   */
  public enableAutoSave(intervalMs: number = 30000): void {
    this.disableAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(async () => {
      if (this.currentDocument && this.currentDocument.isDirty) {
        try {
          await this.performAutoSave();
        } catch (error) {
          console.error('Auto-save failed:', error);
          this.emit({ 
            type: 'error', 
            error: 'Auto-save failed: ' + (error instanceof Error ? error.message : 'Unknown error')
          });
        }
      }
    }, intervalMs);
  }

  /**
   * Disable auto-save functionality
   */
  public disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Perform auto-save operation
   */
  private async performAutoSave(): Promise<void> {
    if (!this.currentDocument) return;

    try {
      // Validate content before saving
      this.validateContent(this.currentDocument.content);

      // Create writable stream and write content
      const writable = await this.currentDocument.handle.createWritable();
      await writable.write(this.currentDocument.content);
      await writable.close();

      // Update document state
      this.currentDocument.isDirty = false;
      this.currentDocument.lastSaved = Date.now();

      // Create snapshot for auto-save
      this.createSnapshot('auto_save');

      this.emit({ type: 'document_saved', timestamp: this.currentDocument.lastSaved });
    } catch (error) {
      throw error; // Re-throw for error handling in enableAutoSave
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
    this.disableAutoSave();
    this.currentDocument = null;
  }
}

export const documentService = DocumentService.getInstance();