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
 * Simplified Execution Context
 * Context for simplified tool execution with DocumentService integration
 */
export interface SimplifiedExecutionContext {
  documentService: IDocumentService;
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
  | { type: "new" };

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

/**
 * Document Service Interface
 * Manages document operations and state
 */
export interface IDocumentService {
  // Document state management
  getCurrentDocument(): DocumentState | null;
  setCurrentDocument(handle: FileSystemFileHandle, path: string): Promise<void>;
  
  // Content operations
  getContent(): string;
  appendContent(content: string): Promise<void>;
  replaceContent(target: string, replacement: string): Promise<void>;
  searchContent(pattern: string): MatchResult[];
  
  // Position-aware content operations
  insertAt(position: number, content: string): Promise<void>;
  deleteRange(start: number, end: number): Promise<void>;
  replaceRange(start: number, end: number, replacement: string): Promise<void>;
  
  // File operations
  saveDocument(): Promise<void>;
  revertToSnapshot(snapshotId: string): Promise<void>;
  
  // Event system
  subscribe(listener: DocumentEventListener): () => void;
}

/**
 * Document State Interface
 */
export interface DocumentState {
  handle: FileSystemFileHandle;
  path: string;
  content: string;
  isDirty: boolean;
  lastSaved: number;
  snapshots: DocumentSnapshot[];
}

/**
 * Document Snapshot Interface
 */
export interface DocumentSnapshot {
  id: string;
  timestamp: number;
  content: string;
  triggerEvent: 'manual_save' | 'tool_execution';
  messageId?: string;
}

/**
 * Match Result Interface
 */
export interface MatchResult {
  line: number;
  column: number;
  match: string;
  context: string;
}

/**
 * Document Event Types
 */
export type DocumentEvent = 
  | { type: 'content_changed'; content: string }
  | { type: 'document_saved'; timestamp: number }
  | { type: 'document_loaded'; path: string }
  | { type: 'error'; error: string };

export type DocumentEventListener = (event: DocumentEvent) => void;
