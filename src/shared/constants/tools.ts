/**
 * Simplified Tool Definitions
 * These 6 simplified tools provide clear, single-purpose capabilities for LLM agents
 * Each tool has minimal parameters and unambiguous functionality
 */

import type { ToolDefinition } from '../types/models';

export const SIMPLIFIED_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read',
    description: 'Read the complete content of the currently active document in the editor',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'write',
    description: 'Append new content to the end of the currently active document',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to append to the current document',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'read_workspace_file',
    description: 'Read the complete content of any file in the workspace by relative path',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative path to the file in the workspace',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'grep',
    description: 'Search for a regex pattern within the currently active document',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The regex pattern to search for in the current document',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'replace',
    description: 'Replace target content with new content in the currently active document',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The exact text to find and replace in the current document',
        },
        newContent: {
          type: 'string',
          description: 'The new content to replace the target with',
        },
      },
      required: ['target', 'newContent'],
    },
  },
  {
    name: 'ls',
    description: 'List the complete file tree structure of the workspace',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// Keep the old tool definitions for backward compatibility during transition
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the content of a file from the workspace or the current file in the editor',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative path to the file to read. If omitted, reads the current file in the editor.',
        },
      },
      required: [],
    },
  },
  {
    name: 'write_append',
    description: 'Append content to the end of the current file in the editor',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to append to the file',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'find_replace',
    description: 'Find and replace specific text in the current file',
    parameters: {
      type: 'object',
      properties: {
        find: {
          type: 'string',
          description: 'The text to find in the file',
        },
        replace: {
          type: 'string',
          description: 'The text to replace it with',
        },
        all: {
          type: 'boolean',
          description: 'Whether to replace all occurrences (true) or just the first one (false)',
          default: false,
        },
      },
      required: ['find', 'replace'],
    },
  },
  {
    name: 'read_workspace',
    description: 'List all files and directories in the workspace',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The relative path to list. If omitted, lists the root of the workspace.',
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to recursively list subdirectories',
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: 'grep_search',
    description: 'Search for a pattern in files within the workspace',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The search pattern (supports regex)',
        },
        path: {
          type: 'string',
          description: 'The relative path to search in. If omitted, searches the entire workspace.',
        },
        filePattern: {
          type: 'string',
          description: 'File pattern to filter (e.g., "*.ts" for TypeScript files)',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Whether the search should be case-sensitive',
          default: false,
        },
      },
      required: ['pattern'],
    },
  },
];
