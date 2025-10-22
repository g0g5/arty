/**
 * Shared Types Index
 * Central export point for all type definitions
 */

// Core data models
export type {
  ProviderProfile,
  ToolDefinition,
  ToolCall,
  ChatMessage,
  FileTreeNode,
  WorkspaceState,
  ChatSession,
} from './models';

// Chrome storage schema
export type {
  AppSettings,
  StorageSchema,
  StorageKey,
  StorageChange,
  StorageChanges,
} from './storage';

// Service interfaces
export type {
  IStorageService,
  ILLMService,
  IFileSystemService,
  ExecutionContext,
  IToolExecutionService,
  Command,
  ChatContext,
  ICommandParserService,
} from './services';

// Component props
export type {
  PopupPanelProps,
  SettingsLayoutProps,
  CategoryListProps,
  ProviderListProps,
  ProviderFormProps,
  ProviderCardProps,
  ToolGridProps,
  ToolCardProps,
  WorkspacePanelProps,
  WorkspaceTreeProps,
  FileNodeProps,
  FolderNodeProps,
  TextEditorPanelProps,
  MarkdownEditorProps,
  ChatPanelProps,
  ChatHeaderProps,
  MessageListProps,
  UserMessageProps,
  AssistantMessageProps,
  ChatInputProps,
  EditorPageProps,
  EditorLayoutProps,
  ButtonProps,
  ToastProps,
  ErrorBoundaryProps,
} from './components';
