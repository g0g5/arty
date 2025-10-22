/**
 * Hardcoded Tool Definitions
 * These tools define the capabilities available to the LLM agent
 */

import type { ToolDefinition } from '../types/models';

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
