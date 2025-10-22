/**
 * Core data models for the Chrome extension
 * These types define the structure of data used throughout the application
 */

/**
 * Provider Profile
 * Represents an LLM service provider configuration
 */
export interface ProviderProfile {
  id: string;                    // UUID
  name: string;                  // User-defined name
  baseUrl: string;               // API endpoint (e.g., https://api.openai.com/v1/)
  apiKey: string;                // Encrypted API key
  models: string[];              // Available model IDs
  createdAt: number;             // Timestamp
  updatedAt: number;             // Timestamp
}

/**
 * Tool Definition
 * Defines the structure of an agent tool capability
 */
export interface ToolDefinition {
  name: string;                  // Tool identifier (e.g., "read_file")
  description: string;           // Human-readable description
  parameters: {                  // JSON Schema for parameters
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Tool Call
 * Represents a tool invocation by the agent
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

/**
 * Chat Message
 * Represents a message in the chat conversation
 */
export interface ChatMessage {
  id: string;                    // UUID
  role: "user" | "assistant";    // Message sender
  content: string;               // Message text
  timestamp: number;             // Unix timestamp
  toolCalls?: ToolCall[];        // Tool invocations (if any)
}

/**
 * File Tree Node
 * Represents a file or directory in the workspace tree
 */
export interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
}

/**
 * Workspace State
 * Represents the current state of the opened workspace
 */
export interface WorkspaceState {
  rootHandle: FileSystemDirectoryHandle | null;
  currentFile: {
    handle: FileSystemFileHandle;
    path: string;
    content: string;
    isDirty: boolean;
  } | null;
  fileTree: FileTreeNode[];
}

/**
 * Chat Session
 * Represents a chat conversation session
 */
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  selectedModel: string;         // Provider ID + Model ID
  toolsEnabled: boolean;
  createdAt: number;
}
