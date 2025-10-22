/**
 * Component Props Types
 * Utility types for React component props
 */

import type { 
  ProviderProfile, 
  ToolDefinition, 
  ChatMessage, 
  FileTreeNode,
  ChatSession 
} from './models';

/**
 * Popup Panel Props
 */
export interface PopupPanelProps {
  version: string;
}

/**
 * Settings Layout Props
 */
export interface SettingsLayoutProps {
  children: React.ReactNode;
}

export interface CategoryListProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

/**
 * Provider Settings Props
 */
export interface ProviderListProps {
  providers: ProviderProfile[];
  onEdit: (provider: ProviderProfile) => void;
  onDelete: (providerId: string) => void;
}

export interface ProviderFormProps {
  provider?: ProviderProfile;
  onSave: (provider: ProviderProfile) => void;
  onCancel: () => void;
}

export interface ProviderCardProps {
  provider: ProviderProfile;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Tools Settings Props
 */
export interface ToolGridProps {
  tools: ToolDefinition[];
}

export interface ToolCardProps {
  tool: ToolDefinition;
}

/**
 * Workspace Panel Props
 */
export interface WorkspacePanelProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string) => void;
}

export interface WorkspaceTreeProps {
  fileTree: FileTreeNode[];
  onFileSelect: (path: string) => void;
}

export interface FileNodeProps {
  node: FileTreeNode;
  onSelect: () => void;
}

export interface FolderNodeProps {
  node: FileTreeNode;
  onFileSelect: (path: string) => void;
}

/**
 * Text Editor Panel Props
 */
export interface TextEditorPanelProps {
  content: string;
  filePath: string | null;
  isDirty: boolean;
  onChange: (content: string) => void;
  onSave: () => void;
}

export interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  mode: 'edit' | 'preview';
}

/**
 * Chat Panel Props
 */
export interface ChatPanelProps {
  session: ChatSession;
  providers: ProviderProfile[];
  onSendMessage: (message: string) => void;
  onModelChange: (modelId: string) => void;
  onToolsToggle: (enabled: boolean) => void;
}

export interface ChatHeaderProps {
  selectedModel: string;
  toolsEnabled: boolean;
  availableModels: Array<{ id: string; name: string; providerId: string }>;
  onModelChange: (modelId: string) => void;
  onToolsToggle: (enabled: boolean) => void;
}

export interface MessageListProps {
  messages: ChatMessage[];
}

export interface UserMessageProps {
  message: ChatMessage;
}

export interface AssistantMessageProps {
  message: ChatMessage;
}

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

/**
 * Editor Page Props
 */
export interface EditorPageProps {
  // Main editor page typically doesn't need props
}

export interface EditorLayoutProps {
  children: React.ReactNode;
}

/**
 * Common UI Component Props
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export interface ToastProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
