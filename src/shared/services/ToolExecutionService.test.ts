/**
 * Unit tests for ToolExecutionService
 * Tests tool execution, argument validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolExecutionService } from './ToolExecutionService';
import { FileSystemService } from './FileSystemService';
import type { ExecutionContext } from '../types/services';

// Mock FileSystemService
vi.mock('./FileSystemService', () => {
  const mockFileSystemService = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    findFile: vi.fn(),
    getFileTree: vi.fn(),
  };

  return {
    FileSystemService: {
      getInstance: vi.fn(() => mockFileSystemService),
    },
  };
});

describe('ToolExecutionService', () => {
  let service: ToolExecutionService;
  let mockFileSystemService: any;
  let mockCurrentFile: FileSystemFileHandle;
  let mockWorkspace: FileSystemDirectoryHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    service = ToolExecutionService.getInstance();
    mockFileSystemService = FileSystemService.getInstance();

    // Create mock file handles
    mockCurrentFile = {
      kind: 'file',
      name: 'test.txt',
    } as FileSystemFileHandle;

    mockWorkspace = {
      kind: 'directory',
      name: 'workspace',
      values: vi.fn(),
      getDirectoryHandle: vi.fn(),
    } as any;
  });

  describe('getAvailableTools', () => {
    it('should return list of available tools', () => {
      const tools = service.getAvailableTools();
      
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        'read_file',
        'write_append',
        'find_replace',
        'read_workspace',
        'grep_search',
      ]);
    });
  });

  describe('executeTool', () => {
    it('should throw error for unknown tool', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('unknown_tool', {}, context)
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should throw error for missing required arguments', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('write_append', {}, context)
      ).rejects.toThrow('Missing required argument: content');
    });
  });

  describe('read_file tool', () => {
    it('should read current file when no path provided', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockFileSystemService.readFile.mockResolvedValue('file content');

      const result = await service.executeTool('read_file', {}, context);

      expect(result).toBe('file content');
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockCurrentFile);
    });

    it('should throw error when no current file and no path provided', async () => {
      const context: ExecutionContext = {
        currentFile: null,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('read_file', {}, context)
      ).rejects.toThrow('No file is currently open in the editor');
    });

    it('should read workspace file when path provided', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockWorkspaceFile = { kind: 'file', name: 'other.txt' } as FileSystemFileHandle;
      mockFileSystemService.findFile.mockResolvedValue(mockWorkspaceFile);
      mockFileSystemService.readFile.mockResolvedValue('workspace file content');

      const result = await service.executeTool('read_file', { path: 'src/other.txt' }, context);

      expect(result).toBe('workspace file content');
      expect(mockFileSystemService.findFile).toHaveBeenCalledWith(mockWorkspace, 'src/other.txt');
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockWorkspaceFile);
    });

    it('should throw error when no workspace and path provided', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: null,
      };

      await expect(
        service.executeTool('read_file', { path: 'src/other.txt' }, context)
      ).rejects.toThrow('No workspace is currently open');
    });
  });

  describe('write_append tool', () => {
    it('should append content to current file', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockFileSystemService.readFile.mockResolvedValue('existing content');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const result = await service.executeTool('write_append', { content: '\nnew content' }, context);

      expect(result).toEqual({
        success: true,
        message: 'Appended 12 characters to file',
      });
      expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockCurrentFile);
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        mockCurrentFile,
        'existing content\nnew content'
      );
    });

    it('should throw error when no current file', async () => {
      const context: ExecutionContext = {
        currentFile: null,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('write_append', { content: 'new content' }, context)
      ).rejects.toThrow('No file is currently open in the editor');
    });

    it('should throw error when content is not a string', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('write_append', { content: 123 }, context)
      ).rejects.toThrow('Content must be a string');
    });
  });

  describe('find_replace tool', () => {
    it('should replace first occurrence by default', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockFileSystemService.readFile.mockResolvedValue('hello world hello');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const result = await service.executeTool('find_replace', {
        find: 'hello',
        replace: 'hi',
      }, context);

      expect(result).toEqual({
        success: true,
        replacements: 1,
        message: 'Replaced 1 occurrence(s)',
      });
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        mockCurrentFile,
        'hi world hello'
      );
    });

    it('should replace all occurrences when all=true', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockFileSystemService.readFile.mockResolvedValue('hello world hello');
      mockFileSystemService.writeFile.mockResolvedValue(undefined);

      const result = await service.executeTool('find_replace', {
        find: 'hello',
        replace: 'hi',
        all: true,
      }, context);

      expect(result).toEqual({
        success: true,
        replacements: 2,
        message: 'Replaced 2 occurrence(s)',
      });
      expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(
        mockCurrentFile,
        'hi world hi'
      );
    });

    it('should return failure when text not found', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockFileSystemService.readFile.mockResolvedValue('hello world');

      const result = await service.executeTool('find_replace', {
        find: 'goodbye',
        replace: 'bye',
      }, context);

      expect(result).toEqual({
        success: false,
        replacements: 0,
        message: 'Text not found in file',
      });
      expect(mockFileSystemService.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error when no current file', async () => {
      const context: ExecutionContext = {
        currentFile: null,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('find_replace', { find: 'hello', replace: 'hi' }, context)
      ).rejects.toThrow('No file is currently open in the editor');
    });

    it('should throw error when find or replace are not strings', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('find_replace', { find: 123, replace: 'hi' }, context)
      ).rejects.toThrow('Find and replace arguments must be strings');

      await expect(
        service.executeTool('find_replace', { find: 'hello', replace: 456 }, context)
      ).rejects.toThrow('Find and replace arguments must be strings');
    });
  });

  describe('read_workspace tool', () => {
    it('should list immediate children when recursive=false', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockEntries = [
        { name: 'file1.txt', kind: 'file' },
        { name: 'folder1', kind: 'directory' },
        { name: 'file2.txt', kind: 'file' },
      ];

      mockWorkspace.values = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          for (const entry of mockEntries) {
            yield entry;
          }
        },
      });

      const result = await service.executeTool('read_workspace', {}, context);

      expect(result).toEqual([
        { name: 'folder1', type: 'directory' },
        { name: 'file1.txt', type: 'file' },
        { name: 'file2.txt', type: 'file' },
      ]);
    });

    it('should get file tree when recursive=true', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockTree = [
        { name: 'file1.txt', type: 'file', path: 'file1.txt' },
        {
          name: 'folder1',
          type: 'directory',
          path: 'folder1',
          children: [
            { name: 'file2.txt', type: 'file', path: 'folder1/file2.txt' },
          ],
        },
      ];

      mockFileSystemService.getFileTree.mockResolvedValue(mockTree);

      const result = await service.executeTool('read_workspace', { recursive: true }, context);

      expect(result).toContain('📄 file1.txt');
      expect(result).toContain('📁 folder1');
      expect(result).toContain('📄 file2.txt');
      expect(mockFileSystemService.getFileTree).toHaveBeenCalledWith(mockWorkspace, '');
    });

    it('should navigate to specified path', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockSubDir = {
        kind: 'directory',
        name: 'src',
        values: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { name: 'index.ts', kind: 'file' };
          },
        }),
      } as any;

      mockWorkspace.getDirectoryHandle = vi.fn().mockResolvedValue(mockSubDir);

      const result = await service.executeTool('read_workspace', { path: 'src' }, context);

      expect(mockWorkspace.getDirectoryHandle).toHaveBeenCalledWith('src');
      expect(result).toEqual([{ name: 'index.ts', type: 'file' }]);
    });

    it('should throw error when directory not found', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockWorkspace.getDirectoryHandle = vi.fn().mockRejectedValue(new Error('Not found'));

      await expect(
        service.executeTool('read_workspace', { path: 'nonexistent' }, context)
      ).rejects.toThrow('Directory not found: nonexistent');
    });

    it('should throw error when no workspace', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: null,
      };

      await expect(
        service.executeTool('read_workspace', {}, context)
      ).rejects.toThrow('No workspace is currently open');
    });
  });

  describe('grep_search tool', () => {
    it('should search for pattern in workspace files', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockFile1 = {
        kind: 'file',
        name: 'file1.txt',
      } as FileSystemFileHandle;

      const mockFile2 = {
        kind: 'file',
        name: 'file2.txt',
      } as FileSystemFileHandle;

      mockWorkspace.values = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield mockFile1;
          yield mockFile2;
        },
      });

      mockFileSystemService.readFile
        .mockResolvedValueOnce('hello world\ntest line\nhello again')
        .mockResolvedValueOnce('no match here\nanother line');

      const result = await service.executeTool('grep_search', { pattern: 'hello' }, context);

      expect(result).toEqual([
        { file: 'file1.txt', line: 1, content: 'hello world' },
        { file: 'file1.txt', line: 3, content: 'hello again' },
      ]);
    });

    it('should support case-sensitive search', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      mockWorkspace.values = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield mockFile;
        },
      });

      mockFileSystemService.readFile.mockResolvedValue('Hello world\nhello again');

      const result = await service.executeTool('grep_search', {
        pattern: 'Hello',
        caseSensitive: true,
      }, context);

      expect(result).toEqual([
        { file: 'test.txt', line: 1, content: 'Hello world' },
      ]);
    });

    it('should filter by file pattern', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockTsFile = {
        kind: 'file',
        name: 'test.ts',
      } as FileSystemFileHandle;

      const mockTxtFile = {
        kind: 'file',
        name: 'test.txt',
      } as FileSystemFileHandle;

      mockWorkspace.values = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield mockTsFile;
          yield mockTxtFile;
        },
      });

      mockFileSystemService.readFile.mockResolvedValue('hello world');

      const result = await service.executeTool('grep_search', {
        pattern: 'hello',
        filePattern: '*.ts',
      }, context);

      expect(result).toEqual([
        { file: 'test.ts', line: 1, content: 'hello world' },
      ]);
      expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(1);
    });

    it('should search in subdirectories recursively', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockFile = {
        kind: 'file',
        name: 'file.txt',
      } as FileSystemFileHandle;

      const mockSubDir = {
        kind: 'directory',
        name: 'subdir',
        values: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield mockFile;
          },
        }),
      } as any;

      mockWorkspace.values = vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield mockSubDir;
        },
      });

      mockFileSystemService.readFile.mockResolvedValue('hello world');

      const result = await service.executeTool('grep_search', { pattern: 'hello' }, context);

      expect(result).toEqual([
        { file: 'subdir/file.txt', line: 1, content: 'hello world' },
      ]);
    });

    it('should throw error for invalid regex pattern', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('grep_search', { pattern: '[invalid(' }, context)
      ).rejects.toThrow('Invalid regex pattern');
    });

    it('should throw error when pattern is not a string', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      await expect(
        service.executeTool('grep_search', { pattern: 123 }, context)
      ).rejects.toThrow('Pattern must be a string');
    });

    it('should throw error when no workspace', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: null,
      };

      await expect(
        service.executeTool('grep_search', { pattern: 'hello' }, context)
      ).rejects.toThrow('No workspace is currently open');
    });

    it('should navigate to search path if provided', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      const mockSubDir = {
        kind: 'directory',
        name: 'src',
        values: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            // Empty directory
          },
        }),
      } as any;

      mockWorkspace.getDirectoryHandle = vi.fn().mockResolvedValue(mockSubDir);

      const result = await service.executeTool('grep_search', {
        pattern: 'hello',
        path: 'src',
      }, context);

      expect(mockWorkspace.getDirectoryHandle).toHaveBeenCalledWith('src');
      expect(result).toEqual([]);
    });

    it('should throw error when search path not found', async () => {
      const context: ExecutionContext = {
        currentFile: mockCurrentFile,
        workspace: mockWorkspace,
      };

      mockWorkspace.getDirectoryHandle = vi.fn().mockRejectedValue(new Error('Not found'));

      await expect(
        service.executeTool('grep_search', { pattern: 'hello', path: 'nonexistent' }, context)
      ).rejects.toThrow('Directory not found: nonexistent');
    });
  });
});
