/**
 * File System Service
 * Handles workspace and file operations using File System Access API
 */

/// <reference path="../types/chrome.d.ts" />

import type { FileTreeNode } from '../types/models';
import type { IFileSystemService } from '../types/services';
import { LRUCache } from '../utils/performance';

/**
 * File System Service Implementation
 * Wraps File System Access API with error handling and permission management
 */
export class FileSystemService implements IFileSystemService {
  private static instance: FileSystemService;
  private fileTreeCache: LRUCache<string, FileTreeNode[]> = new LRUCache(20);
  private fileContentCache: LRUCache<string, string> = new LRUCache(100);

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of FileSystemService
   */
  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  /**
   * Open workspace directory
   * Prompts user to select a directory and returns the handle
   * @throws {Error} If user cancels or permission is denied
   */
  public async openWorkspace(): Promise<FileSystemDirectoryHandle> {
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API is not supported in this browser');
      }

      // Prompt user to select a directory
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Verify we have permission
      const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const requestPermission = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (requestPermission !== 'granted') {
          throw new Error('Permission denied to access directory');
        }
      }

      return dirHandle;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('User cancelled directory selection');
        }
        throw error;
      }
      throw new Error('Failed to open workspace directory');
    }
  }

  /**
   * Read file content (with caching)
   * @param handle File handle to read from
   * @returns File content as string
   * @throws {Error} If file cannot be read or permission is denied
   */
  public async readFile(handle: FileSystemFileHandle): Promise<string> {
    try {
      // Create cache key from handle name
      const cacheKey = handle.name;
      
      // Check cache first
      if (this.fileContentCache.has(cacheKey)) {
        const cachedContent = this.fileContentCache.get(cacheKey)!;
        
        // Verify file hasn't been modified (simple check)
        // In production, you might want to check lastModified timestamp
        return cachedContent;
      }
      
      // Get file object
      const file = await handle.getFile();
      
      // Read file content
      const content = await file.text();
      
      // Cache the content
      this.fileContentCache.set(cacheKey, content);
      
      return content;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied to read file');
        }
        if (error.name === 'NotFoundError') {
          throw new Error('File not found');
        }
        throw error;
      }
      throw new Error('Failed to read file');
    }
  }

  /**
   * Write content to file
   * @param handle File handle to write to
   * @param content Content to write
   * @throws {Error} If file cannot be written or permission is denied
   */
  public async writeFile(handle: FileSystemFileHandle, content: string): Promise<void> {
    try {
      // Create a writable stream
      const writable = await handle.createWritable();
      
      // Write content
      await writable.write(content);
      
      // Close the stream
      await writable.close();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied to write file');
        }
        throw error;
      }
      throw new Error('Failed to write file');
    }
  }

  /**
   * Get file tree structure (with caching and lazy loading)
   * Recursively scans directory and builds tree structure
   * @param dirHandle Directory handle to scan
   * @param basePath Base path for relative paths (default: '')
   * @param maxDepth Maximum depth to traverse (default: 10, prevents infinite loops)
   * @param currentDepth Current depth in recursion (internal use)
   * @returns Array of file tree nodes
   * @throws {Error} If directory cannot be read or permission is denied
   */
  public async getFileTree(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string = '',
    maxDepth: number = 10,
    currentDepth: number = 0
  ): Promise<FileTreeNode[]> {
    try {
      // Check cache first
      const cacheKey = `${dirHandle.name}:${basePath}`;
      if (this.fileTreeCache.has(cacheKey)) {
        return this.fileTreeCache.get(cacheKey)!;
      }

      // Prevent infinite recursion
      if (currentDepth >= maxDepth) {
        return [];
      }

      const nodes: FileTreeNode[] = [];

      // Iterate through directory entries
      for await (const entry of dirHandle.values()) {
        const path = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          // Add file node
          nodes.push({
            name: entry.name,
            type: 'file',
            path: path
          });
        } else if (entry.kind === 'directory') {
          // For lazy loading, only load first level children immediately
          // Deeper levels can be loaded on demand
          let children: FileTreeNode[] = [];
          
          if (currentDepth < 2) {
            // Load children for first 2 levels
            children = await this.getFileTree(
              entry as FileSystemDirectoryHandle, 
              path, 
              maxDepth, 
              currentDepth + 1
            );
          }
          
          // Add directory node with children
          nodes.push({
            name: entry.name,
            type: 'directory',
            path: path,
            children: children
          });
        }
      }

      // Sort nodes: directories first, then files, both alphabetically
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      // Cache the result
      this.fileTreeCache.set(cacheKey, nodes);

      return nodes;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied to read directory');
        }
        throw error;
      }
      throw new Error('Failed to get file tree');
    }
  }

  /**
   * Find file by path
   * Locates a file in the workspace by its relative path
   * @param rootHandle Root directory handle
   * @param path Relative path to file (e.g., 'src/index.ts')
   * @returns File handle
   * @throws {Error} If file is not found or permission is denied
   */
  public async findFile(
    rootHandle: FileSystemDirectoryHandle,
    path: string
  ): Promise<FileSystemFileHandle> {
    try {
      // Normalize path separators
      const normalizedPath = path.replace(/\\/g, '/');
      
      // Split path into segments
      const segments = normalizedPath.split('/').filter(s => s.length > 0);
      
      if (segments.length === 0) {
        throw new Error('Invalid file path');
      }

      // Navigate through directory structure
      let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = rootHandle;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLastSegment = i === segments.length - 1;

        if (currentHandle.kind !== 'directory') {
          throw new Error(`Invalid path: ${segment} is not a directory`);
        }

        if (isLastSegment) {
          // Get file handle
          try {
            currentHandle = await currentHandle.getFileHandle(segment);
          } catch (error) {
            throw new Error(`File not found: ${path}`);
          }
        } else {
          // Get directory handle
          try {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
          } catch (error) {
            throw new Error(`Directory not found: ${segments.slice(0, i + 1).join('/')}`);
          }
        }
      }

      // Verify final handle is a file
      if (currentHandle.kind !== 'file') {
        throw new Error(`Path is not a file: ${path}`);
      }

      return currentHandle as FileSystemFileHandle;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied to access file');
        }
        if (error.name === 'NotFoundError') {
          throw new Error(`File not found: ${path}`);
        }
        throw error;
      }
      throw new Error(`Failed to find file: ${path}`);
    }
  }

  /**
   * Check if File System Access API is supported
   * @returns true if supported, false otherwise
   */
  public isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.fileTreeCache.clear();
    this.fileContentCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { 
    fileTreeCacheSize: number; 
    fileContentCacheSize: number;
  } {
    return {
      fileTreeCacheSize: this.fileTreeCache.size(),
      fileContentCacheSize: this.fileContentCache.size()
    };
  }

  /**
   * Verify permission for a directory handle
   * @param dirHandle Directory handle to check
   * @param mode Permission mode ('read' or 'readwrite')
   * @returns true if permission is granted, false otherwise
   */
  public async verifyPermission(
    dirHandle: FileSystemDirectoryHandle,
    mode: 'read' | 'readwrite' = 'readwrite'
  ): Promise<boolean> {
    try {
      const permission = await dirHandle.queryPermission({ mode });
      if (permission === 'granted') {
        return true;
      }

      // Request permission if not granted
      const requestPermission = await dirHandle.requestPermission({ mode });
      return requestPermission === 'granted';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const fileSystemService = FileSystemService.getInstance();
