# Requirements Document

## Introduction

This document specifies the requirements for a lightweight Chrome extension that provides an agentic LLM-based editor. The extension enables users to edit text files with AI assistance, where an LLM agent can read, write, and modify file content through natural language interactions. The extension is built with React, Vite, TailwindCSS, and TypeScript, managed by pnpm.

## Glossary

- **Extension**: The Chrome browser extension application
- **Popup Panel**: The small UI that appears when clicking the extension icon in Chrome toolbar
- **Settings Page**: A full-page interface for configuring providers, tools, and MCPs
- **Editor Page**: The main interface containing workspace viewer, text editor, and chat panel
- **Provider**: An LLM service provider (OpenAI, Anthropic, Gemini, etc.)
- **Provider Profile**: A configuration containing base URL, API key, and available models for a provider
- **Tool**: A capability the agent can use (read, write, edit, grep, etc.)
- **MCP**: Model Context Protocol integration
- **Workspace**: A local folder opened by the user containing files to edit
- **Agent**: The LLM-powered assistant that can perform file operations
- **Chat Panel**: The interface where users interact with the LLM agent
- **Text Editor**: The component for viewing and editing file content

## Requirements

### Requirement 1

**User Story:** As a user, I want to access the extension through a popup panel, so that I can quickly navigate to settings or the editor.

#### Acceptance Criteria

1. WHEN the user clicks the extension icon in Chrome toolbar, THE Extension SHALL display the Popup Panel
2. THE Popup Panel SHALL display a logo placeholder, extension name, and version number
3. THE Popup Panel SHALL provide an "Open Settings" button
4. THE Popup Panel SHALL provide an "Open Editor" button
5. WHEN the user clicks "Open Settings", THE Extension SHALL open the Settings Page
6. WHEN the user clicks "Open Editor", THE Extension SHALL open the Editor Page

### Requirement 2

**User Story:** As a user, I want to configure LLM providers, so that I can use different AI services with the editor.

#### Acceptance Criteria

1. THE Settings Page SHALL display a layout with categories on the left occupying 25% width and settings content on the right occupying 75% width
2. THE Settings Page SHALL provide a "Providers" category in the left panel
3. WHEN the user selects the "Providers" category, THE Settings Page SHALL display provider configuration options
4. THE Extension SHALL allow users to create multiple provider profiles
5. THE Extension SHALL store base URL, API key, and available models for each provider profile
6. THE Extension SHALL support OpenAI API-compatible providers

### Requirement 3

**User Story:** As a user, I want to view available tools, so that I understand what capabilities the agent has.

#### Acceptance Criteria

1. THE Settings Page SHALL provide a "Tools" category in the left panel
2. WHEN the user selects the "Tools" category, THE Settings Page SHALL display available tools in a grid layout
3. THE Settings Page SHALL render each tool as a card showing its definition JSON
4. THE Extension SHALL display tools including read, write, edit, and grep capabilities

### Requirement 4

**User Story:** As a user, I want to access MCP integration settings, so that I can configure Model Context Protocol features in the future.

#### Acceptance Criteria

1. THE Settings Page SHALL provide an "MCPs" category in the left panel
2. WHEN the user selects the "MCPs" category, THE Settings Page SHALL display a placeholder page

### Requirement 5

**User Story:** As a user, I want to open a local folder as a workspace, so that I can work with multiple files in the editor.

#### Acceptance Criteria

1. THE Editor Page SHALL display a workspace files viewer on the left occupying 25% width
2. THE Extension SHALL allow users to open a local folder as workspace
3. THE Workspace Viewer SHALL display the folder structure and files
4. WHEN the user selects a file from the workspace, THE Extension SHALL open that file in the text editor

### Requirement 6

**User Story:** As a user, I want to edit text files in plain text format, so that I can work with any text content as-is.

#### Acceptance Criteria

1. THE Editor Page SHALL display a text editor in the middle occupying 50% width
2. THE Text Editor SHALL display all text files as plain text without rendering
3. THE Text Editor SHALL allow users to manually edit file content
4. THE Extension SHALL display file content when a file is opened from the workspace
5. THE Text Editor SHALL provide a manual save button to persist changes to the file
6. WHEN the user clicks the save button, THE Extension SHALL write the current editor content to the file
7. WHEN the user navigates away from the editor page, THE Extension SHALL trigger a save operation for any unsaved changes
8. THE Text Editor SHALL display an indicator showing whether the file has unsaved changes

### Requirement 7

**User Story:** As a user, I want to interact with an LLM agent through a chat interface, so that I can request AI-assisted edits to my files.

#### Acceptance Criteria

1. THE Editor Page SHALL display a chat panel on the right occupying 25% width
2. THE Chat Panel SHALL display messages from both user and model
3. THE Chat Panel SHALL provide an input field at the bottom for user messages
4. THE Chat Panel SHALL provide a model selector showing all available models from configured providers
5. THE Chat Panel SHALL provide a toggle to enable or disable tools for the agent

### Requirement 8

**User Story:** As a user, I want to use fast commands in the chat, so that I can quickly perform common actions.

#### Acceptance Criteria

1. WHEN the user types "/new" in the chat input, THE Extension SHALL create a new chat session
2. WHEN the user types "/revert" in the chat input, THE Extension SHALL revert the last change made by the model

### Requirement 9

**User Story:** As a user, I want the agent to read and modify file content, so that I can get AI assistance with editing.

#### Acceptance Criteria

1. THE Agent SHALL have the ability to read the current file content in the text editor
2. THE Agent SHALL have the ability to read workspace file content when needed
3. THE Agent SHALL have the ability to write new content at the end of the current file
4. THE Agent SHALL have the ability to find and replace specific parts of the file with new content
5. WHEN tools are enabled, THE Extension SHALL allow the agent to execute file operations

### Requirement 10

**User Story:** As a user, I want to access settings from the editor page, so that I can quickly adjust configurations while working.

#### Acceptance Criteria

1. THE Editor Page SHALL display a settings icon in the leftmost trim
2. WHEN the user clicks the settings icon, THE Extension SHALL open the Settings Page

### Requirement 11

**User Story:** As a user, I want to start with AI-generated drafts, so that I can quickly create new content.

#### Acceptance Criteria

1. WHEN the user prompts the model with content creation requests, THE Agent SHALL generate draft content
2. THE Extension SHALL support prompts for creating tech blogs, commentary articles, stories, and other content types
3. THE Extension SHALL insert the generated content into the text editor
4. THE Extension SHALL allow users to manually edit the AI-generated content

### Requirement 12

**User Story:** As a developer, I want message history to be maintained reliably during multi-turn tool calling, so that the agent has complete context for all operations.

#### Acceptance Criteria

1. THE Extension SHALL maintain chat message history independently from React component state
2. WHEN the agent executes tool calls, THE Extension SHALL preserve all previous messages in the conversation
3. WHEN the agent makes multiple tool calls in sequence, THE Extension SHALL include tool results in subsequent LLM requests
4. THE Extension SHALL use an event-driven architecture where services emit state changes and UI components subscribe to updates
5. THE ChatSessionManager service SHALL maintain the authoritative message history
6. WHEN a tool calling workflow completes, THE Extension SHALL ensure no messages are lost or duplicated in the history
