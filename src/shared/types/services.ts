/**
 * Service Interface Types
 * Defines interfaces for service layer components
 */

import type { 
  ProviderProfile, 
  ToolDefinition, 
  ChatMessage, 
  FileTreeNode 
} from './models';
import type { AppSettings } from './storage';

/**
 * Storage Service Interface
 * Handles all Chrome storage operations
 */
export interface IStorageService {
  saveProviders(providers: ProviderProfile[]): Promise<void>;
  getProviders(): Promise<ProviderProfile[]>;
  saveSettings(settings: AppSettings): Promise<void>;
  getSettings(): Promise<AppSettings>;
  encryptApiKey(key: string): Promise<string>;
  decryptApiKey(encrypted: string): Promise<string>;
}

/**
 * LLM Service Interface
 * Manages communication with LLM providers
 */
export interface ILLMService {
  sendMessage(
    provider: ProviderProfile,
    model: string,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    onStream?: (chunk: string) => void
  ): Promise<ChatMessage>;
  
  listModels(provider: ProviderProfile): Promise<string[]>;
}

/**
 * File System Service Interface
 * Manages workspace and file operations
 */
export interface IFileSystemService {
  openWorkspace(): Promise<FileSystemDirectoryHandle>;
  readFile(handle: FileSystemFileHandle): Promise<string>;
  writeFile(handle: FileSystemFileHandle, content: string): Promise<void>;
  getFileTree(dirHandle: FileSystemDirectoryHandle): Promise<FileTreeNode[]>;
  findFile(rootHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle>;
}

/**
 * Execution Context
 * Context provided to tool execution
 */
export interface ExecutionContext {
  currentFile: FileSystemFileHandle | null;
  workspace: FileSystemDirectoryHandle | null;
}

/**
 * Tool Execution Service Interface
 * Executes agent tool calls
 */
export interface IToolExecutionService {
  executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<any>;
  
  getAvailableTools(): ToolDefinition[];
}

/**
 * Command Types
 * Chat command definitions
 */
export type Command = 
  | { type: "new" }
  | { type: "revert" };

/**
 * Chat Context
 * Context for command execution
 */
export interface ChatContext {
  sessionId: string;
  messages: ChatMessage[];
  currentFile: FileSystemFileHandle | null;
}

/**
 * Command Parser Service Interface
 * Parses and executes chat commands
 */
export interface ICommandParserService {
  parseCommand(input: string): Command | null;
  executeCommand(command: Command, context: ChatContext): void;
}
