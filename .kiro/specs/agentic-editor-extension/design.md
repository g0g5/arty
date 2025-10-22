# Design Document

## Overview

This document outlines the technical design for a Chrome extension that provides an agentic LLM-based editor. The extension uses React 19, Vite 7, TailwindCSS 4, and TypeScript 5.9, managed by pnpm. The architecture follows Chrome extension manifest V3 specifications and implements a multi-page extension with popup, settings, and editor interfaces.

The core innovation is the integration of LLM agents with file editing capabilities, allowing users to interact with AI assistants that can read, write, and modify file content through natural language commands.

## Architecture

### Chrome Extension Structure

The extension follows Manifest V3 architecture with multiple entry points:

```
extension/
├── manifest.json          # Extension manifest (V3)
├── popup/                 # Popup panel (browser action)
│   ├── index.html
│   └── popup.tsx
├── settings/              # Settings page
│   ├── index.html
│   └── settings.tsx
├── editor/                # Main editor page
│   ├── index.html
│   └── editor.tsx
├── background/            # Service worker
│   └── service-worker.ts
└── shared/                # Shared code
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    └── utils/
```

### Build Configuration

Vite will be configured to build multiple entry points for the extension:
- Popup bundle (popup.html + popup.tsx)
- Settings bundle (settings.html + settings.tsx)
- Editor bundle (editor.html + editor.tsx)
- Service worker bundle (service-worker.ts)

The build output will be structured to match Chrome extension requirements with proper manifest.json configuration.

### State Management

The extension uses a layered state management approach with clear separation between UI and business logic:

1. **Service Layer State**: ChatSessionManager maintains message history and conversation state independently from React
2. **Local Component State**: React useState/useReducer for UI-specific state (loading, errors, file selection)
3. **Chrome Storage API**: For persistent configuration (providers, settings)
4. **Event-Driven Updates**: Services emit events that UI components subscribe to for rendering
5. **Message Passing**: For communication between extension pages and service worker

**Key Architectural Decision**: Message handling is decoupled from React state to prevent stale closure issues during multi-turn tool calling workflows. The ChatSessionManager service maintains the authoritative message history and emits events for UI updates.

### File System Access

The extension uses the File System Access API (available in Chrome) to:
- Open local folders as workspaces
- Read and write file contents
- Maintain file handles for active workspace

This API provides secure, user-granted access to local files without requiring native messaging.

## Components and Interfaces

### 1. Popup Panel

**Component Structure:**
```
PopupPanel
├── Logo (placeholder)
├── ExtensionInfo (name, version)
└── ActionButtons
    ├── OpenSettingsButton
    └── OpenEditorButton
```

**Key Features:**
- Minimal UI (300x400px recommended)
- Opens settings/editor in new tabs using `chrome.tabs.create()`
- Reads version from manifest.json dynamically

### 2. Settings Page

**Component Structure:**
```
SettingsPage
├── SettingsLayout
│   ├── Sidebar (25% width)
│   │   ├── CategoryList
│   │   │   ├── ProvidersCategory
│   │   │   ├── ToolsCategory
│   │   │   └── MCPsCategory
│   └── ContentArea (75% width)
│       ├── ProvidersSettings
│       │   ├── ProviderList
│       │   ├── ProviderForm
│       │   └── ProviderCard
│       ├── ToolsSettings
│       │   └── ToolGrid
│       │       └── ToolCard
│       └── MCPsSettings (placeholder)
```

**Provider Settings:**
- CRUD operations for provider profiles
- Form fields: Profile name, Base URL, API Key (masked), Models (comma-separated or multi-select)
- Validation for URL format and required fields
- Storage in `chrome.storage.local` with encryption for API keys

**Tools Settings:**
- Read-only grid display of available tools
- Each tool card shows:
  - Tool name
  - Description
  - JSON definition (formatted, syntax-highlighted)
- Tools are hardcoded in the initial version

**MCPs Settings:**
- Placeholder page with "Coming Soon" message
- Reserved for future MCP integration

### 3. Editor Page

**Component Structure:**
```
EditorPage
├── SettingsIconTrim (leftmost)
├── EditorLayout
│   ├── WorkspacePanel (25% width)
│   │   ├── FolderOpenButton
│   │   ├── WorkspaceTree
│   │   │   ├── FolderNode
│   │   │   └── FileNode
│   ├── TextEditorPanel (50% width)
│   │   ├── EditorToolbar
│   │   │   ├── SaveButton
│   │   │   └── DirtyStateIndicator
│   │   ├── PlainTextEditor
│   │   └── EditorStatusBar
│   └── ChatPanel (25% width)
│       ├── ChatHeader
│       │   ├── ModelSelector
│       │   └── ToolsToggle
│       ├── MessageList
│       │   ├── UserMessage
│       │   └── AssistantMessage
│       └── ChatInput
│           ├── CommandParser
│           └── SendButton
```

**Workspace Panel:**
- Uses File System Access API to open folders
- Displays hierarchical file tree
- Supports file selection to load into editor
- Caches directory handles in memory

**Text Editor Panel:**
- Plain text display and editing (no Markdown rendering)
- Single mode: Edit mode using textarea or code editor component
- Display all text files as-is without any formatting or rendering
- Manual save button to persist changes to file
- Save operation triggered automatically when navigating away from editor page (beforeunload event)
- Visual indicator for unsaved changes (dirty state tracking)

**Chat Panel:**
- Scrollable message history
- Model selector dropdown populated from configured providers
- Tools toggle (on/off switch)
- Command detection for `/new` and `/revert`
- Streaming response support for LLM outputs

## Data Models

### Provider Profile

```typescript
interface ProviderProfile {
  id: string;                    // UUID
  name: string;                  // User-defined name
  baseUrl: string;               // API endpoint (e.g., https://api.openai.com/v1/)
  apiKey: string;                // Encrypted API key
  models: string[];              // Available model IDs
  createdAt: number;             // Timestamp
  updatedAt: number;             // Timestamp
}
```

### Tool Definition

```typescript
interface ToolDefinition {
  name: string;                  // Tool identifier (e.g., "read_file")
  description: string;           // Human-readable description
  parameters: {                  // JSON Schema for parameters
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}
```

### Chat Message

```typescript
interface ChatMessage {
  id: string;                    // UUID
  role: "user" | "assistant";    // Message sender
  content: string;               // Message text
  timestamp: number;             // Unix timestamp
  toolCalls?: ToolCall[];        // Tool invocations (if any)
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}
```

### Workspace State

```typescript
interface WorkspaceState {
  rootHandle: FileSystemDirectoryHandle | null;
  currentFile: {
    handle: FileSystemFileHandle;
    path: string;
    content: string;
    isDirty: boolean;
  } | null;
  fileTree: FileTreeNode[];
}

interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
}
```

### Chat Session

```typescript
interface ChatSession {
  id: string;
  messages: ChatMessage[];
  selectedModel: string;         // Provider ID + Model ID
  toolsEnabled: boolean;
  createdAt: number;
}
```

## Core Services

### 1. Chat Session Manager Service

**Purpose**: Manages chat sessions and message history independently from UI state, handling the complete tool calling workflow.

```typescript
class ChatSessionManager {
  createSession(selectedModel: string, toolsEnabled: boolean): ChatSession
  getSession(sessionId: string): ChatSession | undefined
  getMessages(sessionId: string): ChatMessage[]
  
  async sendMessage(
    sessionId: string,
    content: string,
    provider: ProviderProfile,
    modelName: string,
    executionContext: ExecutionContext
  ): Promise<void>
  
  updateSession(sessionId: string, updates: Partial<ChatSession>): void
  clearSession(sessionId: string): void
  deleteSession(sessionId: string): void
  
  subscribe(listener: ChatSessionListener): () => void
}

type ChatSessionEvent = 
  | { type: 'message_added'; message: ChatMessage }
  | { type: 'message_updated'; messageId: string; updates: Partial<ChatMessage> }
  | { type: 'streaming_chunk'; messageId: string; chunk: string }
  | { type: 'session_updated'; session: ChatSession }
  | { type: 'error'; error: string };
```

**Key Responsibilities**:
- Maintains authoritative message history outside React state
- Coordinates LLM calls with streaming support
- Executes complete tool calling workflow (including recursive multi-turn calls)
- Emits events for UI updates
- Handles errors in conversation flow

**Architectural Benefits**:
- **No stale closures**: Direct access to current state eliminates React closure issues
- **Reliable message history**: Messages are never lost during tool execution
- **Testable**: Business logic can be tested independently from UI
- **Scalable**: Easy to add features like persistence, undo/redo, session management

### 2. Storage Service

Handles all Chrome storage operations:

```typescript
class StorageService {
  async saveProviders(providers: ProviderProfile[]): Promise<void>
  async getProviders(): Promise<ProviderProfile[]>
  async saveSettings(settings: AppSettings): Promise<void>
  async getSettings(): Promise<AppSettings>
  async encryptApiKey(key: string): Promise<string>
  async decryptApiKey(encrypted: string): Promise<string>
}
```

Uses `chrome.storage.local` for persistence. API keys are encrypted using Web Crypto API before storage.

### 3. LLM Service

Manages communication with LLM providers:

```typescript
class LLMService {
  async sendMessage(
    provider: ProviderProfile,
    model: string,
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    onStream?: (chunk: string) => void
  ): Promise<ChatMessage>
  
  async listModels(provider: ProviderProfile): Promise<string[]>
}
```

Implements OpenAI-compatible API calls with streaming support. Handles tool calling protocol for function execution.

### 4. File System Service

Manages workspace and file operations:

```typescript
class FileSystemService {
  async openWorkspace(): Promise<FileSystemDirectoryHandle>
  async readFile(handle: FileSystemFileHandle): Promise<string>
  async writeFile(handle: FileSystemFileHandle, content: string): Promise<void>
  async getFileTree(dirHandle: FileSystemDirectoryHandle): Promise<FileTreeNode[]>
  async findFile(rootHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle>
}
```

Wraps File System Access API with error handling and permission management.

### 5. Tool Execution Service

Executes agent tool calls:

```typescript
class ToolExecutionService {
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<any>
  
  getAvailableTools(): ToolDefinition[]
}

interface ExecutionContext {
  currentFile: FileSystemFileHandle | null;
  workspace: FileSystemDirectoryHandle | null;
}
```

Implements tools:
- `read_file`: Read current or workspace file content
- `write_append`: Append content to current file
- `find_replace`: Find and replace text in current file
- `read_workspace`: List workspace files
- `grep_search`: Search for patterns in workspace

### 6. Command Parser Service

Parses and executes chat commands:

```typescript
class CommandParserService {
  parseCommand(input: string): Command | null
  executeCommand(command: Command, context: ChatContext): void
}

type Command = 
  | { type: "new" }
  | { type: "revert" }
```

## Message Flow Architecture

### Tool Calling Workflow

The ChatSessionManager orchestrates the complete tool calling workflow:

```
User sends message
  ↓
ChatSessionManager.sendMessage()
  ↓
Add user message to session.messages
  ↓
Call LLM with full message history
  ↓
Stream response → emit events → UI updates
  ↓
Tool calls detected in response?
  ↓ Yes
Add assistant message with tool calls
  ↓
Execute all tool calls
  ↓
Update message with tool results
  ↓
Call LLM again with updated history (recursive)
  ↓
Continue until no more tool calls
  ↓
Final assistant message
```

**Critical Design Point**: The service maintains the complete message history internally and passes it to each LLM call. This ensures:
1. No message loss during multi-turn tool calling
2. No stale state from React closures
3. Proper context for the LLM at each step
4. Reliable recursive tool calling support

### UI Integration Pattern

The UI layer subscribes to session events and renders accordingly:

```typescript
// In React component
useEffect(() => {
  const unsubscribe = chatSessionManager.subscribe((event) => {
    switch (event.type) {
      case 'session_updated':
        setChatSession({ ...event.session });
        break;
      case 'streaming_chunk':
        // UI can show real-time streaming if needed
        break;
      case 'error':
        setError(event.error);
        break;
    }
  });
  return unsubscribe;
}, []);

// Send message
await chatSessionManager.sendMessage(
  sessionId,
  userMessage,
  provider,
  modelName,
  executionContext
);
```

The UI is purely reactive - it displays the current session state and delegates all business logic to the service layer.

## Architectural Decisions and Rationale

### Decision: Decouple Message Handling from React State

**Problem Identified**: 
In the initial implementation, message history was managed entirely in React state. During multi-turn tool calling workflows, this caused a critical bug where message history would be lost after tool execution. The root cause was React's asynchronous state batching combined with stale closures:

1. When tool calls were executed, the code captured `chatSession.messages` in a closure
2. State updates happened asynchronously via `setChatSession()`
3. By the time the follow-up LLM call was made, the closure contained stale message history
4. The LLM received incomplete context, missing the tool results and previous conversation

**Solution Implemented**:
Created a `ChatSessionManager` service that maintains message history outside React's state management:

- **Independent State**: Service holds the authoritative message history in memory
- **Event-Driven Updates**: Service emits events when state changes; UI subscribes and re-renders
- **Direct Access**: No closures - service methods always access current state directly
- **Complete Workflow**: Service handles the entire tool calling cycle internally

**Benefits**:
- ✅ Reliable message history - no loss during tool execution
- ✅ No stale closure issues - direct state access
- ✅ Cleaner separation - business logic decoupled from UI
- ✅ More testable - service can be tested independently
- ✅ Easier to extend - add features like persistence, undo/redo

**Trade-offs**:
- Additional abstraction layer (service + event system)
- UI must subscribe to events (slightly more boilerplate)
- State exists in two places (service + React state for rendering)

**Conclusion**: The benefits far outweigh the trade-offs. This architecture is more robust, maintainable, and aligns with best practices for complex state management in React applications.

## Error Handling

### Error Categories

1. **Storage Errors**: Failed to save/load from Chrome storage
2. **API Errors**: LLM provider API failures (network, auth, rate limits)
3. **File System Errors**: Permission denied, file not found, write failures
4. **Tool Execution Errors**: Invalid arguments, execution failures

### Error Handling Strategy

- **User-Facing Errors**: Display toast notifications with actionable messages
- **Recoverable Errors**: Retry with exponential backoff (API calls)
- **Critical Errors**: Log to console, show error boundary UI
- **Validation Errors**: Inline form validation with clear messages

### Error UI Components

```typescript
<ErrorBoundary fallback={<ErrorFallbackUI />}>
  <App />
</ErrorBoundary>

<Toast 
  type="error" | "warning" | "info"
  message={string}
  action?: { label: string, onClick: () => void }
/>
```

## Testing Strategy

### Unit Tests

- **Services**: Mock Chrome APIs, test business logic
- **Utilities**: Pure functions (encryption, parsing, formatting)
- **Hooks**: Test custom React hooks with `@testing-library/react-hooks`

### Integration Tests

- **Storage Service + Chrome Storage**: Test with mock chrome.storage API
- **LLM Service + API**: Test with mock fetch responses
- **Tool Execution**: Test tool implementations with mock file handles

### E2E Tests

- **Popup Flow**: Open popup → Navigate to settings/editor
- **Provider Configuration**: Add/edit/delete provider profiles
- **Editor Workflow**: Open workspace → Edit file → Chat with agent → Apply changes
- **Command Execution**: Test `/new` and `/revert` commands

### Testing Tools

- **Vitest**: Unit and integration tests
- **Testing Library**: React component testing
- **MSW**: Mock API responses
- **Chrome Extension Testing**: Use `chrome` mock library

## Security Considerations

### API Key Protection

- Encrypt API keys before storing in `chrome.storage.local`
- Use Web Crypto API with a key derived from extension ID
- Never log or expose API keys in console/UI
- Mask API keys in settings UI (show only last 4 characters)

### File System Access

- Request permissions explicitly via File System Access API
- Validate file paths to prevent directory traversal
- Limit file operations to user-granted directory handles
- Show clear permission prompts to users

### Content Security Policy

Configure strict CSP in manifest.json:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### LLM Interaction Safety

- Sanitize user inputs before sending to LLM
- Validate tool call arguments before execution
- Implement rate limiting for API calls
- Provide user confirmation for destructive operations

## Performance Optimization

### Code Splitting

- Lazy load settings and editor pages
- Split vendor bundles (React, TailwindCSS)
- Dynamic imports for heavy components if needed

### Caching Strategy

- Cache provider configurations in memory
- Cache file tree structure (invalidate on workspace change)
- Memoize expensive computations (file tree rendering)

### Streaming Optimization

- Stream LLM responses for better UX
- Use `ReadableStream` for chunked processing
- Update UI incrementally during streaming

### Bundle Size

- Tree-shake unused TailwindCSS classes
- Use lightweight markdown renderer
- Minimize dependencies (prefer native APIs)

## Accessibility

### Keyboard Navigation

- Full keyboard support for all interactive elements
- Tab order follows logical flow
- Keyboard shortcuts for common actions (Ctrl+S for save, Ctrl+Enter for send)

### Screen Reader Support

- Semantic HTML elements
- ARIA labels for icon buttons
- Live regions for chat messages and notifications
- Alt text for images and icons

### Visual Accessibility

- High contrast mode support
- Sufficient color contrast ratios (WCAG AA)
- Focus indicators for all interactive elements
- Resizable text (respect browser zoom)

## Future Enhancements

### Phase 2 Features

- **MCP Integration**: Full Model Context Protocol support
- **Multi-file Editing**: Edit multiple files simultaneously
- **Version Control**: Git integration for tracking changes
- **Collaborative Editing**: Share sessions with team members
- **Custom Tools**: Allow users to define custom agent tools
- **Template Library**: Pre-built prompts and workflows

### Scalability Considerations

- **IndexedDB**: Migrate to IndexedDB for larger data storage
- **Web Workers**: Offload heavy computations (file parsing, search)
- **Virtual Scrolling**: Handle large file trees and chat histories
- **Offline Support**: Cache provider responses, work offline

## Technology Stack Summary

- **Framework**: React 19 with TypeScript 5.9
- **Build Tool**: Vite 7 with custom Chrome extension plugin
- **Styling**: TailwindCSS 4
- **State Management**: React Context + Chrome Storage API
- **File System**: File System Access API
- **LLM Integration**: OpenAI-compatible API (fetch)
- **Testing**: Vitest + Testing Library
- **Package Manager**: pnpm
