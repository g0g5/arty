# Design Document

## Overview

This design document outlines the architectural refactoring of the Chrome extension editor to improve tool clarity, implement proper separation of concerns, and enhance user experience with better chat session management. The refactoring focuses on three main areas:

1. **Tool System Simplification**: Replacing the current complex tool set with 6 clear, purpose-specific tools
2. **Document Service Architecture**: Implementing a service layer pattern similar to ChatSessionManager for document operations
3. **Enhanced Chat Management**: Adding new chat sessions and history management capabilities

## Architecture

### Current Architecture Analysis

The existing system follows a service-oriented architecture with:
- **ChatSessionManager**: Manages chat sessions and message history
- **ToolExecutionService**: Handles tool execution with complex parameter validation
- **FileSystemService**: Manages file system operations
- **UI Components**: React components that directly interact with services

**Current Issues:**
- Tools have ambiguous parameters and overlapping functionality
- Document editing logic is mixed within UI components
- No chat history management or session archival
- Complex tool parameter validation creates confusion for LLM agents

### Target Architecture

The refactored architecture will maintain the existing service patterns while introducing:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ChatPanel  │  TextEditorPanel  │  WorkspacePanel          │
│  - New Chat │  - Document View  │  - File Tree             │
│  - History  │  - Auto-save      │  - File Selection        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ChatSessionManager  │  DocumentService  │  HistoryService  │
│  - Session mgmt      │  - Document ops   │  - Archive mgmt  │
│  - Message history   │  - Content cache  │  - Title gen     │
│  - Tool calling      │  - Auto-save      │  - Persistence   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Simplified Tool Layer                       │
├─────────────────────────────────────────────────────────────┤
│  read()  │  write()  │  read_file()  │  grep()  │  replace() │ ls()  │
│  No args │  content  │  path         │  pattern │  old, new  │ No args │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                File System Layer                            │
├─────────────────────────────────────────────────────────────┤
│              FileSystemService (existing)                   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Simplified Tool Definitions

**New Tool Set:**
```typescript
interface SimplifiedTools {
  read(): string;                           // Current document content
  write(content: string): void;             // Append to current document
  read_file(path: string): string;          // Read workspace file
  grep(pattern: string): MatchResult[];     // Search current document
  replace(target: string, newContent: string): void; // Replace in current document
  ls(): FileTreeStructure;                  // Workspace file tree
}
```

**Key Improvements:**
- Each tool has a single, clear purpose
- Minimal parameter sets reduce confusion
- No optional parameters or complex validation
- Clear distinction between current document and workspace operations

### 2. Document Service

**Interface:**
```typescript
interface IDocumentService {
  // Document state management
  getCurrentDocument(): DocumentState | null;
  setCurrentDocument(handle: FileSystemFileHandle, path: string): Promise<void>;
  
  // Content operations
  getContent(): string;
  appendContent(content: string): Promise<void>;
  replaceContent(target: string, replacement: string): Promise<void>;
  searchContent(pattern: string): MatchResult[];
  
  // File operations
  saveDocument(): Promise<void>;
  revertToSnapshot(snapshotId: string): Promise<void>;
  
  // Event system
  subscribe(listener: DocumentEventListener): () => void;
  
  // Auto-save management
  enableAutoSave(intervalMs: number): void;
  disableAutoSave(): void;
}

interface DocumentState {
  handle: FileSystemFileHandle;
  path: string;
  content: string;
  isDirty: boolean;
  lastSaved: number;
  snapshots: DocumentSnapshot[];
}

type DocumentEvent = 
  | { type: 'content_changed'; content: string }
  | { type: 'document_saved'; timestamp: number }
  | { type: 'document_loaded'; path: string }
  | { type: 'error'; error: string };
```

**Implementation Strategy:**
- Follow the same event-driven pattern as ChatSessionManager
- Maintain document content in memory for performance
- Implement automatic saving with configurable intervals
- Create snapshots for revert functionality
- Emit events for UI synchronization

### 3. Chat History Service

**Interface:**
```typescript
interface IChatHistoryService {
  // Archive management
  archiveSession(session: ChatSession): Promise<string>;
  getArchivedSessions(): Promise<ChatHistoryRecord[]>;
  restoreSession(historyId: string): Promise<ChatSession>;
  deleteArchivedSession(historyId: string): Promise<void>;
  
  // Title generation
  generateTitle(firstMessage: string): string;
  
  // Persistence
  saveHistory(): Promise<void>;
  loadHistory(): Promise<void>;
}

interface ChatHistoryRecord {
  id: string;
  title: string;
  createdAt: number;
  archivedAt: number;
  messageCount: number;
  session: ChatSession;
}
```

**Title Generation Logic:**
- Use first user message as base title
- Truncate at 50 characters with ellipsis
- Remove special characters and normalize whitespace
- Fallback to timestamp if no user message exists

### 4. Enhanced Chat Panel

**New UI Elements:**
```typescript
interface ChatPanelProps {
  // Existing props...
  onNewChat: () => void;
  onShowHistory: () => void;
  historyRecords: ChatHistoryRecord[];
  onRestoreSession: (historyId: string) => void;
}
```

**UI Layout Changes:**
```
┌─────────────────────────────────────┐
│ [New Chat] [History] [Model▼] [⚙️]  │ ← Header with new buttons
├─────────────────────────────────────┤
│                                     │
│        Message History              │
│                                     │
├─────────────────────────────────────┤
│ [Input Field]              [Send]   │ ← Input area
└─────────────────────────────────────┘
```

**History Modal:**
```
┌─────────────────────────────────────┐
│           Chat History              │
├─────────────────────────────────────┤
│ 📝 How to implement user auth...    │
│    3 messages • 2 hours ago         │
├─────────────────────────────────────┤
│ 🔧 Fix the database connection...   │
│    7 messages • 1 day ago           │
├─────────────────────────────────────┤
│ 📊 Create analytics dashboard...    │
│    12 messages • 3 days ago         │
└─────────────────────────────────────┘
```

## Data Models

### Enhanced Tool Execution Context

```typescript
interface SimplifiedExecutionContext {
  documentService: IDocumentService;
  workspace: FileSystemDirectoryHandle | null;
}
```

### Document Snapshot System

```typescript
interface DocumentSnapshot {
  id: string;
  timestamp: number;
  content: string;
  triggerEvent: 'manual_save' | 'tool_execution' | 'auto_save';
  messageId?: string; // Link to chat message that triggered change
}
```

## Error Handling

### Tool Execution Errors

**Simplified Error Responses:**
- Clear, actionable error messages
- No complex validation chains
- Consistent error format across all tools

```typescript
interface ToolError {
  tool: string;
  message: string;
  context?: {
    currentDocument?: string;
    workspace?: boolean;
  };
}
```

### Document Service Errors

**Error Categories:**
- File system access errors
- Content parsing errors
- Save/load operation failures
- Auto-save conflicts

**Error Recovery:**
- Automatic retry for transient failures
- Graceful degradation when file system is unavailable
- User notification for critical errors

## Testing Strategy

### Unit Testing

**Document Service Tests:**
- Content manipulation operations
- Event emission verification
- Auto-save functionality
- Snapshot management

**Simplified Tool Tests:**
- Each tool function in isolation
- Error condition handling
- Context validation

**History Service Tests:**
- Archive/restore operations
- Title generation logic
- Persistence mechanisms

### Integration Testing

**Service Integration:**
- Document Service ↔ Tool Execution
- Chat Session ↔ History Service
- UI Components ↔ Service Events

**End-to-End Scenarios:**
- Complete chat session with tool usage
- New chat creation and history archival
- Document editing with auto-save
- Session restoration from history

### Performance Testing

**Document Service Performance:**
- Large file handling (>1MB)
- Frequent content updates
- Memory usage optimization

**Tool Execution Performance:**
- Regex search on large documents
- File tree generation for large workspaces
- Concurrent tool execution

## Migration Strategy

### Phase 1: Document Service Implementation
1. Create DocumentService class following ChatSessionManager patterns
2. Implement core document operations (read, write, save)
3. Add event system for UI synchronization
4. Integrate with existing TextEditorPanel

### Phase 2: Tool System Refactoring
1. Create new simplified tool definitions
2. Update ToolExecutionService to use DocumentService
3. Remove complex parameter validation
4. Update tool execution context

### Phase 3: Chat History Implementation
1. Create ChatHistoryService
2. Implement archive/restore functionality
3. Add title generation logic
4. Integrate with ChatSessionManager

### Phase 4: UI Enhancements
1. Add New Chat and History buttons to ChatPanel
2. Implement history modal dialog
3. Update chat session lifecycle management
4. Add auto-clear on editor close

### Phase 5: Testing and Optimization
1. Comprehensive testing of all new functionality
2. Performance optimization
3. Error handling improvements
4. Documentation updates

## Backward Compatibility

**Existing Functionality Preservation:**
- All current tool capabilities maintained through new simplified tools
- Existing chat sessions continue to work
- File system operations remain unchanged
- Provider and model configurations unaffected

**Migration Path:**
- New tools will be introduced alongside existing ones
- Gradual migration of tool calls to new format
- Deprecation warnings for old tool usage
- Complete removal of old tools in future version

## Security Considerations

**File System Access:**
- Maintain existing file system permission model
- Validate all file paths to prevent directory traversal
- Sanitize content before writing to files

**Data Persistence:**
- Encrypt sensitive chat history data
- Implement secure storage for archived sessions
- Clear temporary data on extension unload

**Tool Execution:**
- Validate all tool parameters before execution
- Prevent code injection through content manipulation
- Limit resource usage for large operations