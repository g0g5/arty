# Implementation Plan

- [x] 1. Set up Chrome extension project structure and build configuration






  - Configure Vite for multi-entry Chrome extension build (popup, settings, editor, service worker)
  - Create manifest.json with Manifest V3 configuration including permissions for storage and tabs
  - Set up directory structure: popup/, settings/, editor/, background/, shared/
  - Configure TailwindCSS for all entry points
  - Add TypeScript types for Chrome APIs (@types/chrome)
  - _Requirements: 1.1, 2.1, 5.1, 6.1, 7.1, 10.1_

- [x] 2. Implement shared types and data models





  - Create TypeScript interfaces for ProviderProfile, ToolDefinition, ChatMessage, WorkspaceState, ChatSession
  - Define types for Chrome storage schema
  - Create utility types for component props and service interfaces
  - _Requirements: 2.4, 2.5, 2.6, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Build Storage Service with encryption





  - Implement StorageService class wrapping chrome.storage.local API
  - Add methods for saving/loading provider profiles and settings
  - Implement API key encryption/decryption using Web Crypto API
  - Create storage migration utilities for future schema changes
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 3.1 Write unit tests for Storage Service






  - Test save/load operations with mock chrome.storage
  - Test encryption/decryption of API keys
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 4. Create Popup Panel UI





  - Build PopupPanel component with logo placeholder, extension name, and version
  - Implement OpenSettingsButton that opens settings page in new tab
  - Implement OpenEditorButton that opens editor page in new tab
  - Style with TailwindCSS (300x400px layout)
  - Read version dynamically from manifest.json
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 5. Build Settings Page layout and navigation





  - Create SettingsLayout component with sidebar (25%) and content area (75%)
  - Implement CategoryList with Providers, Tools, and MCPs categories
  - Add routing/state management for category selection
  - Style with TailwindCSS responsive layout
  - _Requirements: 2.1, 2.2, 3.1, 4.1_

- [x] 6. Implement Provider Settings functionality





  - Create ProviderList component displaying all configured providers
  - Build ProviderForm with fields for name, base URL, API key, and models
  - Implement CRUD operations (create, read, update, delete) for provider profiles
  - Add form validation for URL format and required fields
  - Integrate with StorageService to persist provider profiles
  - Mask API keys in UI (show only last 4 characters)
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6.1 Write integration tests for Provider Settings





  - Test provider CRUD operations with mock storage
  - Test form validation logic
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7. Implement Tools Settings display





  - Define hardcoded tool definitions (read_file, write_append, find_replace, read_workspace, grep_search)
  - Create ToolCard component displaying tool name, description, and JSON definition
  - Build ToolGrid component with responsive grid layout
  - Add syntax highlighting for JSON definitions
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Create MCPs Settings placeholder




  - Build MCPsSettings component with "Coming Soon" message
  - Add placeholder UI for future MCP integration
  - _Requirements: 4.1, 4.2_

- [x] 9. Implement File System Service





  - Create FileSystemService class wrapping File System Access API
  - Implement openWorkspace() method to prompt user for directory
  - Add readFile() and writeFile() methods for file operations
  - Build getFileTree() method to recursively scan directory structure
  - Implement findFile() method to locate files by path
  - Add error handling for permission denied and file not found cases
  - _Requirements: 5.1, 5.2, 9.1, 9.2, 9.3, 9.4_

- [x] 9.1 Write unit tests for File System Service






  - Test file operations with mock FileSystemHandle
  - Test error handling for permission and file access errors
  - _Requirements: 5.1, 5.2, 9.1, 9.2, 9.3, 9.4_

- [x] 10. Build Workspace Panel UI





  - Create WorkspacePanel component with FolderOpenButton
  - Implement WorkspaceTree component displaying hierarchical file structure
  - Build FileNode and FolderNode components with expand/collapse functionality
  - Add file selection handler to load file into editor
  - Integrate with FileSystemService for folder opening and tree generation
  - Cache directory handle in component state
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement Text Editor Panel with plain text support
  > **Note:** Requirements modified - Markdown rendering feature removed. Text editor now displays all files as plain text without any rendering or formatting.
  - Create TextEditorPanel component with editor toolbar and status bar
  - Build PlainTextEditor component for plain text editing
  - ~~Integrate react-markdown for rendering Markdown content~~ (removed)
  - ~~Add syntax highlighting for code blocks in Markdown~~ (removed)
  - Implement auto-save functionality using FileSystemService
  - Track dirty state for unsaved changes
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11.1 Write integration tests for Text Editor
  > **Note:** Requirements modified - Tests for edit/preview mode switching are no longer needed as the dual-mode feature was removed.
  - ~~Test edit/preview mode switching~~ (removed)
  - Test auto-save functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12. Implement LLM Service





  - Create LLMService class for OpenAI-compatible API communication
  - Implement sendMessage() method with streaming support
  - Add tool calling protocol support (function calling)
  - Implement listModels() method to fetch available models from provider
  - Add error handling for network failures, auth errors, and rate limits
  - Support streaming responses with ReadableStream
  - _Requirements: 7.4, 9.5, 11.1, 11.2, 11.3_

- [x] 12.1 Write unit tests for LLM Service






  - Test API calls with mock fetch responses
  - Test streaming response handling
  - Test error handling for various API failures
  - _Requirements: 7.4, 9.5, 11.1, 11.2, 11.3_

- [x] 13. Build Tool Execution Service





  - Create ToolExecutionService class for executing agent tool calls
  - Implement read_file tool to read current or workspace file content
  - Implement write_append tool to append content to current file
  - Implement find_replace tool to find and replace text in current file
  - Implement read_workspace tool to list workspace files
  - Implement grep_search tool to search for patterns in workspace
  - Add argument validation and error handling for each tool
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13.1 Write unit tests for Tool Execution Service






  - Test each tool implementation with mock file handles
  - Test argument validation and error cases
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Implement Command Parser Service





  - Create CommandParserService class for parsing chat commands
  - Implement parseCommand() method to detect /new and /revert commands
  - Build executeCommand() method to handle command execution
  - Add command validation and error messages
  - _Requirements: 8.1, 8.2_

- [x] 15. Build Chat Panel UI





  - Create ChatPanel component with header, message list, and input
  - Implement ModelSelector dropdown populated from configured providers
  - Add ToolsToggle switch to enable/disable agent tools
  - Build MessageList component with UserMessage and AssistantMessage components
  - Create ChatInput component with command detection and send button
  - Style messages with TailwindCSS (user vs assistant differentiation)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Integrate LLM Service with Chat Panel





  - Connect ChatInput to LLMService for sending messages
  - Implement streaming response display in MessageList
  - Add loading states and error handling for API calls
  - Display tool calls and results in chat messages
  - Update chat session state with new messages
  - _Requirements: 7.2, 7.3, 7.4, 9.5, 11.1, 11.2, 11.3_

- [x] 17. Implement chat commands functionality





  - Integrate CommandParserService with ChatInput
  - Implement /new command to create new chat session
  - Implement /revert command to undo last model change to file
  - Add command feedback messages in chat
  - Store change history for revert functionality
  - _Requirements: 8.1, 8.2_

- [x] 18. Wire Tool Execution Service with LLM agent





  - Connect ToolExecutionService to LLM tool calling flow
  - Pass ExecutionContext (current file, workspace) to tool execution
  - Handle tool call requests from LLM responses
  - Execute tools and return results to LLM
  - Display tool execution status in chat
  - Apply file changes from tool executions to Text Editor
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 19. Build Editor Page layout and integration





  - Create EditorPage component with settings icon trim
  - Implement EditorLayout with WorkspacePanel (25%), TextEditorPanel (50%), ChatPanel (25%)
  - Add settings icon that opens Settings Page in new tab
  - Wire up workspace file selection to load file in editor
  - Connect chat panel to current file context for agent operations
  - Implement responsive layout with TailwindCSS
  - _Requirements: 5.1, 6.1, 7.1, 10.1, 10.2_

- [ ] 20. Implement content generation workflow
  - Enable agent to generate draft content from user prompts
  - Support prompts for tech blogs, commentary articles, stories, etc.
  - Insert generated content into Text Editor
  - Allow manual editing of AI-generated content
  - Add examples/templates for common content types
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 21. Add error handling and user feedback
  - Implement ErrorBoundary component for critical errors
  - Create Toast notification component for user-facing errors
  - Add inline validation messages for forms
  - Implement retry logic with exponential backoff for API calls
  - Display clear error messages for file system permission issues
  - Add loading states for all async operations
  - _Requirements: All requirements (error handling is cross-cutting)_

- [ ] 22. Implement security measures
  - Ensure API keys are encrypted before storage
  - Configure Content Security Policy in manifest.json
  - Validate file paths to prevent directory traversal
  - Sanitize user inputs before sending to LLM
  - Validate tool call arguments before execution
  - Add rate limiting for API calls
  - _Requirements: 2.6, 9.5_

- [ ] 23. Add accessibility features
  - Implement keyboard navigation for all interactive elements
  - Add ARIA labels for icon buttons and controls
  - Create live regions for chat messages and notifications
  - Ensure sufficient color contrast ratios (WCAG AA)
  - Add focus indicators for all interactive elements
  - Test with screen readers
  - _Requirements: All requirements (accessibility is cross-cutting)_

- [ ]* 24. Write E2E tests for main workflows
  - Test popup navigation to settings and editor
  - Test provider configuration workflow
  - Test editor workflow: open workspace, edit file, chat with agent
  - Test command execution (/new, /revert)
  - _Requirements: All requirements_

- [ ] 25. Optimize performance and bundle size
  - Implement code splitting for settings and editor pages
  - Add lazy loading for heavy components if needed
  - Configure tree-shaking for TailwindCSS
  - Optimize bundle size by minimizing dependencies
  - Add memoization for expensive computations (file tree rendering)
  - Implement virtual scrolling for large file trees and chat histories
  - _Requirements: All requirements (performance is cross-cutting)_

- [x] 26. Refactor Text Editor to remove Markdown rendering






  - Review current TextEditorPanel implementation for any Markdown-related code
  - Remove react-markdown dependency and related imports
  - Remove any edit/preview mode toggle functionality
  - Remove syntax highlighting for Markdown code blocks
  - Ensure PlainTextEditor displays all files as plain text without rendering
  - Update component to use simple textarea or plain text editor component
  - Verify auto-save functionality works with plain text only
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 27. Remove auto-saving and add manual save functionality





  - Remove auto-save functionality from TextEditorPanel component
  - Add SaveButton component to EditorToolbar
  - Implement manual save operation that writes content to file using FileSystemService
  - Add DirtyStateIndicator component to show unsaved changes status
  - Track dirty state when editor content changes
  - Clear dirty state after successful save operation
  - Implement beforeunload event handler to trigger save when navigating away from editor page
  - Add keyboard shortcut (Ctrl+S / Cmd+S) for save operation
  - _Requirements: 6.5, 6.6, 6.7, 6.8_

- [ ]* 27.1 Update TextEditorPanel tests for manual save
  - Remove tests for auto-save functionality
  - Add tests for manual save button click
  - Add tests for dirty state tracking
  - Add tests for beforeunload save trigger
  - Add tests for keyboard shortcut save
  - _Requirements: 6.5, 6.6, 6.7, 6.8_
