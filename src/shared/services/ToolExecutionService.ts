/**
 * Tool Execution Service
 * Executes agent tool calls with proper validation and error handling
 */

import type { ToolDefinition } from '../types/models';
import type { IToolExecutionService, ExecutionContext } from '../types/services';
import { TOOL_DEFINITIONS } from '../constants/tools';
import { FileSystemService } from './FileSystemService';

/**
 * Tool Execution Service Implementation
 * Handles execution of all agent tools
 */
export class ToolExecutionService implements IToolExecutionService {
  private static instance: ToolExecutionService;
  private fileSystemService: FileSystemService;

  private constructor() {
    this.fileSystemService = FileSystemService.getInstance();
  }

  /**
   * Get singleton instance of ToolExecutionService
   */
  public static getInstance(): ToolExecutionService {
    if (!ToolExecutionService.instance) {
      ToolExecutionService.instance = new ToolExecutionService();
    }
    return ToolExecutionService.instance;
  }

  /**
   * Execute a tool by name with given arguments
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @param context Execution context (current file, workspace)
   * @returns Tool execution result
   * @throws {Error} If tool is not found, arguments are invalid, or execution fails
   */
  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    // Find tool definition
    const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
    if (!toolDef) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Validate required arguments
    this.validateArguments(toolDef, args);

    // Execute the appropriate tool
    switch (toolName) {
      case 'read_file':
        return await this.executeReadFile(args, context);
      case 'write_append':
        return await this.executeWriteAppend(args, context);
      case 'find_replace':
        return await this.executeFindReplace(args, context);
      case 'read_workspace':
        return await this.executeReadWorkspace(args, context);
      case 'grep_search':
        return await this.executeGrepSearch(args, context);
      default:
        throw new Error(`Tool not implemented: ${toolName}`);
    }
  }

  /**
   * Get list of available tools
   * @returns Array of tool definitions
   */
  public getAvailableTools(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  /**
   * Validate tool arguments against tool definition
   * @param toolDef Tool definition
   * @param args Arguments to validate
   * @throws {Error} If required arguments are missing or invalid
   */
  private validateArguments(toolDef: ToolDefinition, args: Record<string, any>): void {
    const required = toolDef.parameters.required || [];
    
    for (const param of required) {
      if (!(param in args) || args[param] === undefined || args[param] === null) {
        throw new Error(`Missing required argument: ${param}`);
      }
    }
  }

  /**
   * Execute read_file tool
   * Reads content from current file or workspace file
   */
  private async executeReadFile(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<string> {
    const path = args.path as string | undefined;

    if (!path) {
      // Read current file
      if (!context.currentFile) {
        throw new Error('No file is currently open in the editor');
      }
      
      const content = await this.fileSystemService.readFile(context.currentFile);
      return content;
    } else {
      // Read workspace file
      if (!context.workspace) {
        throw new Error('No workspace is currently open');
      }

      const fileHandle = await this.fileSystemService.findFile(context.workspace, path);
      const content = await this.fileSystemService.readFile(fileHandle);
      return content;
    }
  }

  /**
   * Execute write_append tool
   * Appends content to the current file
   */
  private async executeWriteAppend(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; message: string }> {
    if (!context.currentFile) {
      throw new Error('No file is currently open in the editor');
    }

    const content = args.content as string;
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // Read current content
    const currentContent = await this.fileSystemService.readFile(context.currentFile);
    
    // Append new content
    const newContent = currentContent + content;
    
    // Write back to file
    await this.fileSystemService.writeFile(context.currentFile, newContent);

    return {
      success: true,
      message: `Appended ${content.length} characters to file`
    };
  }

  /**
   * Execute find_replace tool
   * Finds and replaces text in the current file
   */
  private async executeFindReplace(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<{ success: boolean; replacements: number; message: string }> {
    if (!context.currentFile) {
      throw new Error('No file is currently open in the editor');
    }

    const find = args.find as string;
    const replace = args.replace as string;
    const all = args.all === true;

    if (typeof find !== 'string' || typeof replace !== 'string') {
      throw new Error('Find and replace arguments must be strings');
    }

    // Read current content
    const currentContent = await this.fileSystemService.readFile(context.currentFile);

    // Perform replacement
    let newContent: string;
    let replacements: number;

    if (all) {
      // Replace all occurrences
      const regex = new RegExp(this.escapeRegex(find), 'g');
      newContent = currentContent.replace(regex, replace);
      replacements = (currentContent.match(regex) || []).length;
    } else {
      // Replace first occurrence only
      const index = currentContent.indexOf(find);
      if (index === -1) {
        return {
          success: false,
          replacements: 0,
          message: 'Text not found in file'
        };
      }
      newContent = currentContent.substring(0, index) + replace + currentContent.substring(index + find.length);
      replacements = 1;
    }

    // Write back to file
    await this.fileSystemService.writeFile(context.currentFile, newContent);

    return {
      success: true,
      replacements,
      message: `Replaced ${replacements} occurrence(s)`
    };
  }

  /**
   * Execute read_workspace tool
   * Lists files and directories in the workspace
   */
  private async executeReadWorkspace(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<any> {
    if (!context.workspace) {
      throw new Error('No workspace is currently open');
    }

    const path = args.path as string | undefined;
    const recursive = args.recursive === true;

    let dirHandle: FileSystemDirectoryHandle;

    if (!path) {
      // List root workspace
      dirHandle = context.workspace;
    } else {
      // Navigate to specified path
      const segments = path.replace(/\\/g, '/').split('/').filter(s => s.length > 0);
      dirHandle = context.workspace;

      for (const segment of segments) {
        try {
          dirHandle = await dirHandle.getDirectoryHandle(segment);
        } catch (error) {
          throw new Error(`Directory not found: ${path}`);
        }
      }
    }

    if (recursive) {
      // Get full tree structure
      const tree = await this.fileSystemService.getFileTree(dirHandle, path || '');
      return this.formatFileTree(tree);
    } else {
      // List only immediate children
      const entries: Array<{ name: string; type: string }> = [];
      
      for await (const entry of dirHandle.values()) {
        entries.push({
          name: entry.name,
          type: entry.kind
        });
      }

      // Sort: directories first, then files
      entries.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      return entries;
    }
  }

  /**
   * Execute grep_search tool
   * Searches for patterns in workspace files
   */
  private async executeGrepSearch(
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<Array<{ file: string; line: number; content: string }>> {
    if (!context.workspace) {
      throw new Error('No workspace is currently open');
    }

    const pattern = args.pattern as string;
    const searchPath = args.path as string | undefined;
    const filePattern = args.filePattern as string | undefined;
    const caseSensitive = args.caseSensitive === true;

    if (typeof pattern !== 'string') {
      throw new Error('Pattern must be a string');
    }

    // Create regex from pattern
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern}`);
    }

    // Determine starting directory
    let searchDir: FileSystemDirectoryHandle;
    if (!searchPath) {
      searchDir = context.workspace;
    } else {
      const segments = searchPath.replace(/\\/g, '/').split('/').filter(s => s.length > 0);
      searchDir = context.workspace;

      for (const segment of segments) {
        try {
          searchDir = await searchDir.getDirectoryHandle(segment);
        } catch (error) {
          throw new Error(`Directory not found: ${searchPath}`);
        }
      }
    }

    // Search files
    const results: Array<{ file: string; line: number; content: string }> = [];
    await this.searchDirectory(searchDir, '', regex, filePattern, results);

    return results;
  }

  /**
   * Recursively search directory for pattern matches
   */
  private async searchDirectory(
    dirHandle: FileSystemDirectoryHandle,
    basePath: string,
    regex: RegExp,
    filePattern: string | undefined,
    results: Array<{ file: string; line: number; content: string }>
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'file') {
        // Check if file matches file pattern
        if (filePattern && !this.matchesFilePattern(entry.name, filePattern)) {
          continue;
        }

        try {
          // Read file content
          const fileHandle = entry as FileSystemFileHandle;
          const content = await this.fileSystemService.readFile(fileHandle);

          // Search for pattern in file
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              results.push({
                file: entryPath,
                line: i + 1,
                content: lines[i].trim()
              });
            }
            // Reset regex lastIndex for global flag
            regex.lastIndex = 0;
          }
        } catch (error) {
          // Skip files that can't be read (binary files, permission issues, etc.)
          continue;
        }
      } else if (entry.kind === 'directory') {
        // Recursively search subdirectory
        await this.searchDirectory(
          entry as FileSystemDirectoryHandle,
          entryPath,
          regex,
          filePattern,
          results
        );
      }
    }
  }

  /**
   * Check if filename matches file pattern (glob-style)
   */
  private matchesFilePattern(filename: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }

  /**
   * Format file tree for output
   */
  private formatFileTree(nodes: any[], indent: string = ''): string {
    let output = '';
    
    for (const node of nodes) {
      output += `${indent}${node.type === 'directory' ? '📁' : '📄'} ${node.name}\n`;
      
      if (node.children && node.children.length > 0) {
        output += this.formatFileTree(node.children, indent + '  ');
      }
    }
    
    return output;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const toolExecutionService = ToolExecutionService.getInstance();
