/**
 * Unit tests for ToolExecutionService
 * Tests tool execution, argument validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolExecutionService } from './ToolExecutionService';
import { FileSystemService } from './FileSystemService';
import { DocumentService } from './DocumentService';
import type { ExecutionContext, SimplifiedExecutionContext } from '../types/services';

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

// Mock DocumentService
vi.mock('./DocumentService', () => {
  const mockDocumentService = {
    getContent: vi.fn(),
    appendContent: vi.fn(),
    replaceContent: vi.fn(),
    searchContent: vi.fn(),
    getCurrentDocument: vi.fn(),
  };

  return {
    DocumentService: {
      getInstance: vi.fn(() => mockDocumentService),
    },
  };
});

describe('ToolExecutionService', () => {
  let service: ToolExecutionService;
  let mockFileSystemService: any;
  let mockDocumentService: any;
  let mockCurrentFile: FileSystemFileHandle;
  let mockWorkspace: FileSystemDirectoryHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    service = ToolExecutionService.getInstance();
    mockFileSystemService = FileSystemService.getInstance();
    mockDocumentService = DocumentService.getInstance();

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
    it('should return simplified tools by default', () => {
      const tools = service.getAvailableTools();
      
      expect(tools).toHaveLength(6);
      expect(tools.map(t => t.name)).toEqual([
        'read',
        'write',
        'read_workspace_file',
        'grep',
        'replace',
        'ls',
      ]);
    });

    it('should return legacy tools when useSimplified=false', () => {
      const tools = service.getAvailableTools(false);
      
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

  // ========================================
  // SIMPLIFIED TOOLS TESTS
  // ========================================

  describe('Simplified Tools', () => {
    let simplifiedContext: SimplifiedExecutionContext;

    beforeEach(() => {
      simplifiedContext = {
        documentService: mockDocumentService,
        workspace: mockWorkspace,
      };
    });

    describe('read tool', () => {
      it('should return current document content', async () => {
        mockDocumentService.getContent.mockReturnValue('Hello, World!');

        const result = await service.executeSimplifiedTool('read', {}, simplifiedContext);

        expect(result).toBe('Hello, World!');
        expect(mockDocumentService.getContent).toHaveBeenCalledTimes(1);
      });

      it('should throw error when no document is loaded', async () => {
        mockDocumentService.getContent.mockImplementation(() => {
          throw new Error('No document is currently loaded');
        });

        await expect(
          service.executeSimplifiedTool('read', {}, simplifiedContext)
        ).rejects.toThrow('No document is currently loaded');
      });

      it('should work with empty document', async () => {
        mockDocumentService.getContent.mockReturnValue('');

        const result = await service.executeSimplifiedTool('read', {}, simplifiedContext);

        expect(result).toBe('');
      });

      it('should work with large document content', async () => {
        const largeContent = 'x'.repeat(100000);
        mockDocumentService.getContent.mockReturnValue(largeContent);

        const result = await service.executeSimplifiedTool('read', {}, simplifiedContext);

        expect(result).toBe(largeContent);
        expect(result.length).toBe(100000);
      });
    });

    describe('write tool', () => {
      it('should append content to current document', async () => {
        mockDocumentService.appendContent.mockResolvedValue(undefined);

        const result = await service.executeSimplifiedTool('write', {
          content: '\nNew line of text'
        }, simplifiedContext);

        expect(result).toEqual({
          success: true,
          message: 'Appended 17 characters to current document'
        });
        expect(mockDocumentService.appendContent).toHaveBeenCalledWith('\nNew line of text');
      });

      it('should throw error when content parameter is missing', async () => {
        await expect(
          service.executeSimplifiedTool('write', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: content');
      });

      it('should throw error when content is not a string', async () => {
        await expect(
          service.executeSimplifiedTool('write', { content: 123 }, simplifiedContext)
        ).rejects.toThrow('Content parameter must be a string');
      });

      it('should throw error when no document is loaded', async () => {
        mockDocumentService.appendContent.mockRejectedValue(
          new Error('No document is currently loaded')
        );

        await expect(
          service.executeSimplifiedTool('write', { content: 'test' }, simplifiedContext)
        ).rejects.toThrow('No document is currently loaded');
      });

      it('should handle empty content string', async () => {
        mockDocumentService.appendContent.mockResolvedValue(undefined);

        const result = await service.executeSimplifiedTool('write', {
          content: ''
        }, simplifiedContext);

        expect(result).toEqual({
          success: true,
          message: 'Appended 0 characters to current document'
        });
      });

      it('should handle multiline content', async () => {
        mockDocumentService.appendContent.mockResolvedValue(undefined);
        const multilineContent = 'Line 1\nLine 2\nLine 3';

        const result = await service.executeSimplifiedTool('write', {
          content: multilineContent
        }, simplifiedContext);

        expect(result.success).toBe(true);
        expect(mockDocumentService.appendContent).toHaveBeenCalledWith(multilineContent);
      });
    });

    describe('read_workspace_file tool', () => {
      it('should read workspace file by path', async () => {
        const mockFile = { kind: 'file', name: 'config.json' } as FileSystemFileHandle;
        mockFileSystemService.findFile.mockResolvedValue(mockFile);
        mockFileSystemService.readFile.mockResolvedValue('{"key": "value"}');

        const result = await service.executeSimplifiedTool('read_workspace_file', {
          path: 'config.json'
        }, simplifiedContext);

        expect(result).toBe('{"key": "value"}');
        expect(mockFileSystemService.findFile).toHaveBeenCalledWith(mockWorkspace, 'config.json');
        expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockFile);
      });

      it('should throw error when path parameter is missing', async () => {
        await expect(
          service.executeSimplifiedTool('read_workspace_file', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: path');
      });

      it('should throw error when path is not a string', async () => {
        await expect(
          service.executeSimplifiedTool('read_workspace_file', { path: 123 }, simplifiedContext)
        ).rejects.toThrow('Path parameter must be a string');
      });

      it('should throw error when no workspace is open', async () => {
        const noWorkspaceContext: SimplifiedExecutionContext = {
          documentService: mockDocumentService,
          workspace: null,
        };

        await expect(
          service.executeSimplifiedTool('read_workspace_file', { path: 'test.txt' }, noWorkspaceContext)
        ).rejects.toThrow('No workspace is currently open');
      });

      it('should throw error when file not found', async () => {
        mockFileSystemService.findFile.mockRejectedValue(new Error('File not found'));

        await expect(
          service.executeSimplifiedTool('read_workspace_file', {
            path: 'nonexistent.txt'
          }, simplifiedContext)
        ).rejects.toThrow("Failed to read file 'nonexistent.txt'");
      });

      it('should handle nested file paths', async () => {
        const mockFile = { kind: 'file', name: 'component.tsx' } as FileSystemFileHandle;
        mockFileSystemService.findFile.mockResolvedValue(mockFile);
        mockFileSystemService.readFile.mockResolvedValue('export const Component = () => {}');

        const result = await service.executeSimplifiedTool('read_workspace_file', {
          path: 'src/components/component.tsx'
        }, simplifiedContext);

        expect(result).toBe('export const Component = () => {}');
        expect(mockFileSystemService.findFile).toHaveBeenCalledWith(
          mockWorkspace,
          'src/components/component.tsx'
        );
      });
    });

    describe('grep tool', () => {
      it('should search current document with regex pattern', async () => {
        const mockResults = [
          { line: 1, column: 1, match: 'hello', context: 'hello world' },
          { line: 3, column: 5, match: 'hello', context: 'say hello again' }
        ];
        mockDocumentService.searchContent.mockReturnValue(mockResults);

        const result = await service.executeSimplifiedTool('grep', {
          pattern: 'hello'
        }, simplifiedContext);

        expect(result).toEqual(mockResults);
        expect(mockDocumentService.searchContent).toHaveBeenCalledWith('hello');
      });

      it('should throw error when pattern parameter is missing', async () => {
        await expect(
          service.executeSimplifiedTool('grep', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: pattern');
      });

      it('should throw error when pattern is not a string', async () => {
        await expect(
          service.executeSimplifiedTool('grep', { pattern: 123 }, simplifiedContext)
        ).rejects.toThrow('Pattern parameter must be a string');
      });

      it('should throw error when no document is loaded', async () => {
        mockDocumentService.searchContent.mockImplementation(() => {
          throw new Error('No document is currently loaded');
        });

        await expect(
          service.executeSimplifiedTool('grep', { pattern: 'test' }, simplifiedContext)
        ).rejects.toThrow('No document is currently loaded');
      });

      it('should return empty array when no matches found', async () => {
        mockDocumentService.searchContent.mockReturnValue([]);

        const result = await service.executeSimplifiedTool('grep', {
          pattern: 'nonexistent'
        }, simplifiedContext);

        expect(result).toEqual([]);
      });

      it('should handle complex regex patterns', async () => {
        const mockResults = [
          { line: 2, column: 10, match: 'function test()', context: 'function test() {' }
        ];
        mockDocumentService.searchContent.mockReturnValue(mockResults);

        const result = await service.executeSimplifiedTool('grep', {
          pattern: 'function\\s+\\w+\\(\\)'
        }, simplifiedContext);

        expect(result).toEqual(mockResults);
        expect(mockDocumentService.searchContent).toHaveBeenCalledWith('function\\s+\\w+\\(\\)');
      });

      it('should handle invalid regex patterns gracefully', async () => {
        mockDocumentService.searchContent.mockImplementation(() => {
          throw new Error('Invalid regex pattern');
        });

        await expect(
          service.executeSimplifiedTool('grep', { pattern: '[invalid(' }, simplifiedContext)
        ).rejects.toThrow('Invalid regex pattern');
      });
    });

    describe('replace tool', () => {
      it('should replace target content with new content', async () => {
        mockDocumentService.replaceContent.mockResolvedValue(undefined);

        const result = await service.executeSimplifiedTool('replace', {
          target: 'old text',
          newContent: 'new text'
        }, simplifiedContext);

        expect(result).toEqual({
          success: true,
          message: 'Successfully replaced content in current document'
        });
        expect(mockDocumentService.replaceContent).toHaveBeenCalledWith('old text', 'new text');
      });

      it('should throw error when target parameter is missing', async () => {
        await expect(
          service.executeSimplifiedTool('replace', { newContent: 'test' }, simplifiedContext)
        ).rejects.toThrow('Missing required argument: target');
      });

      it('should throw error when newContent parameter is missing', async () => {
        await expect(
          service.executeSimplifiedTool('replace', { target: 'test' }, simplifiedContext)
        ).rejects.toThrow('Missing required argument: newContent');
      });

      it('should throw error when target is not a string', async () => {
        await expect(
          service.executeSimplifiedTool('replace', {
            target: 123,
            newContent: 'test'
          }, simplifiedContext)
        ).rejects.toThrow('Target and newContent parameters must be strings');
      });

      it('should throw error when newContent is not a string', async () => {
        await expect(
          service.executeSimplifiedTool('replace', {
            target: 'test',
            newContent: 456
          }, simplifiedContext)
        ).rejects.toThrow('Target and newContent parameters must be strings');
      });

      it('should throw error when no document is loaded', async () => {
        mockDocumentService.replaceContent.mockRejectedValue(
          new Error('No document is currently loaded')
        );

        await expect(
          service.executeSimplifiedTool('replace', {
            target: 'old',
            newContent: 'new'
          }, simplifiedContext)
        ).rejects.toThrow('No document is currently loaded');
      });

      it('should throw error when target not found', async () => {
        mockDocumentService.replaceContent.mockRejectedValue(
          new Error('Target content not found for replacement')
        );

        await expect(
          service.executeSimplifiedTool('replace', {
            target: 'nonexistent',
            newContent: 'new'
          }, simplifiedContext)
        ).rejects.toThrow('Target content not found for replacement');
      });

      it('should handle empty strings', async () => {
        mockDocumentService.replaceContent.mockResolvedValue(undefined);

        const result = await service.executeSimplifiedTool('replace', {
          target: 'text',
          newContent: ''
        }, simplifiedContext);

        expect(result.success).toBe(true);
        expect(mockDocumentService.replaceContent).toHaveBeenCalledWith('text', '');
      });

      it('should handle multiline replacements', async () => {
        mockDocumentService.replaceContent.mockResolvedValue(undefined);
        const multilineTarget = 'line1\nline2';
        const multilineNew = 'newline1\nnewline2\nnewline3';

        const result = await service.executeSimplifiedTool('replace', {
          target: multilineTarget,
          newContent: multilineNew
        }, simplifiedContext);

        expect(result.success).toBe(true);
        expect(mockDocumentService.replaceContent).toHaveBeenCalledWith(
          multilineTarget,
          multilineNew
        );
      });
    });

    describe('ls tool', () => {
      it('should return workspace file tree structure', async () => {
        const mockTree = [
          { name: 'file1.txt', type: 'file', path: 'file1.txt' },
          {
            name: 'src',
            type: 'directory',
            path: 'src',
            children: [
              { name: 'index.ts', type: 'file', path: 'src/index.ts' }
            ]
          }
        ];
        mockFileSystemService.getFileTree.mockResolvedValue(mockTree);

        const result = await service.executeSimplifiedTool('ls', {}, simplifiedContext);

        expect(result).toContain('📄 file1.txt');
        expect(result).toContain('📁 src');
        expect(result).toContain('📄 index.ts');
        expect(mockFileSystemService.getFileTree).toHaveBeenCalledWith(mockWorkspace, '');
      });

      it('should throw error when no workspace is open', async () => {
        const noWorkspaceContext: SimplifiedExecutionContext = {
          documentService: mockDocumentService,
          workspace: null,
        };

        await expect(
          service.executeSimplifiedTool('ls', {}, noWorkspaceContext)
        ).rejects.toThrow('No workspace is currently open');
      });

      it('should handle empty workspace', async () => {
        mockFileSystemService.getFileTree.mockResolvedValue([]);

        const result = await service.executeSimplifiedTool('ls', {}, simplifiedContext);

        expect(result).toBe('');
      });

      it('should handle deeply nested directory structures', async () => {
        const mockTree = [
          {
            name: 'src',
            type: 'directory',
            path: 'src',
            children: [
              {
                name: 'components',
                type: 'directory',
                path: 'src/components',
                children: [
                  { name: 'Button.tsx', type: 'file', path: 'src/components/Button.tsx' }
                ]
              }
            ]
          }
        ];
        mockFileSystemService.getFileTree.mockResolvedValue(mockTree);

        const result = await service.executeSimplifiedTool('ls', {}, simplifiedContext);

        expect(result).toContain('📁 src');
        expect(result).toContain('📁 components');
        expect(result).toContain('📄 Button.tsx');
      });

      it('should handle file system errors gracefully', async () => {
        mockFileSystemService.getFileTree.mockRejectedValue(
          new Error('Permission denied')
        );

        await expect(
          service.executeSimplifiedTool('ls', {}, simplifiedContext)
        ).rejects.toThrow('Failed to list workspace files');
      });
    });

    describe('executeSimplifiedTool - general behavior', () => {
      it('should throw error for unknown simplified tool', async () => {
        await expect(
          service.executeSimplifiedTool('unknown_tool', {}, simplifiedContext)
        ).rejects.toThrow('Unknown simplified tool: unknown_tool');
      });

      it('should validate required parameters for all tools', async () => {
        // write tool
        await expect(
          service.executeSimplifiedTool('write', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: content');

        // read_workspace_file tool
        await expect(
          service.executeSimplifiedTool('read_workspace_file', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: path');

        // grep tool
        await expect(
          service.executeSimplifiedTool('grep', {}, simplifiedContext)
        ).rejects.toThrow('Missing required argument: pattern');

        // replace tool
        await expect(
          service.executeSimplifiedTool('replace', { target: 'test' }, simplifiedContext)
        ).rejects.toThrow('Missing required argument: newContent');
      });

      it('should handle null and undefined arguments consistently', async () => {
        await expect(
          service.executeSimplifiedTool('write', { content: null }, simplifiedContext)
        ).rejects.toThrow('Missing required argument: content');

        await expect(
          service.executeSimplifiedTool('write', { content: undefined }, simplifiedContext)
        ).rejects.toThrow('Missing required argument: content');
      });
    });

    describe('executeTool - simplified tool routing', () => {
      it('should route simplified tools through executeSimplifiedTool', async () => {
        mockDocumentService.getContent.mockReturnValue('test content');

        const context: ExecutionContext = {
          currentFile: mockCurrentFile,
          workspace: mockWorkspace,
        };

        const result = await service.executeTool('read', {}, context);

        expect(result).toBe('test content');
        expect(mockDocumentService.getContent).toHaveBeenCalled();
      });

      it('should create simplified context from execution context', async () => {
        mockDocumentService.appendContent.mockResolvedValue(undefined);

        const context: ExecutionContext = {
          currentFile: mockCurrentFile,
          workspace: mockWorkspace,
        };

        await service.executeTool('write', { content: 'test' }, context);

        expect(mockDocumentService.appendContent).toHaveBeenCalledWith('test');
      });
    });
  });
});
