# Requirements Document

## Introduction

This specification defines the requirements for removing the auto-save functionality and the /revert command from the document management system. The auto-save feature was not part of the original design intent, and its removal will simplify the codebase while maintaining the core document editing experience. Documents will only be saved when the user explicitly presses the save button or closes the editor page.

## Glossary

- **DocumentService**: The service class responsible for managing document state, content operations, and file system interactions
- **CommandParserService**: The service class that parses and executes chat commands
- **Auto-save**: The automatic periodic saving of document changes without explicit user action
- **Revert Command**: The /revert chat command that allows users to undo the last model-generated change to a file
- **Snapshot**: A stored copy of document content at a specific point in time
- **Editor Page**: The user interface where documents are opened and edited

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove the auto-save functionality from the DocumentService, so that documents are only saved through explicit user actions

#### Acceptance Criteria

1. THE DocumentService SHALL remove the enableAutoSave() method
2. THE DocumentService SHALL remove the disableAutoSave() method
3. THE DocumentService SHALL remove the performAutoSave() private method
4. THE DocumentService SHALL remove the autoSaveInterval property
5. THE DocumentService SHALL remove the debouncedAutoSave property

### Requirement 2

**User Story:** As a developer, I want to remove auto-save related code from the service interface, so that the API contract reflects the simplified functionality

#### Acceptance Criteria

1. THE IDocumentService interface SHALL remove the enableAutoSave() method signature
2. THE IDocumentService interface SHALL remove the disableAutoSave() method signature

### Requirement 3

**User Story:** As a developer, I want to remove the /revert command functionality, so that the command system is simplified and no longer depends on snapshot history

#### Acceptance Criteria

1. THE CommandParserService SHALL remove the 'revert' case from the parseCommand() method
2. THE CommandParserService SHALL remove the executeRevertCommand() private method
3. THE CommandParserService SHALL remove the findLastModifyingMessage() private method
4. THE CommandParserService SHALL update the validateCommand() error message to exclude /revert from available commands

### Requirement 4

**User Story:** As a developer, I want to remove auto-save related snapshot creation, so that snapshots are only created for manual saves and tool executions

#### Acceptance Criteria

1. THE DocumentService SHALL remove the 'auto_save' trigger event from the createSnapshot() method calls
2. THE DocumentSnapshot type SHALL remove 'auto_save' from the triggerEvent union type

### Requirement 5

**User Story:** As a developer, I want to remove auto-save related tests, so that the test suite only covers the remaining functionality

#### Acceptance Criteria

1. THE DocumentService test suite SHALL remove all tests in the 'Auto-save Functionality' describe block
2. THE CommandParserService test suite SHALL remove all tests related to the /revert command
3. THE integration test suite SHALL remove the 'Document Service Auto-Save Integration' describe block

### Requirement 6

**User Story:** As a developer, I want to remove auto-save related configuration options, so that users cannot enable a feature that no longer exists

#### Acceptance Criteria

1. THE UserSettings type SHALL remove the autoSave property
2. THE UserSettings type SHALL remove the autoSaveInterval property
3. THE StorageService SHALL remove autoSave and autoSaveInterval from default settings initialization

### Requirement 7

**User Story:** As a developer, I want to update user-facing text that references removed commands, so that users are not confused by documentation of non-existent features

#### Acceptance Criteria

1. THE ChatInput component SHALL update the placeholder text to remove reference to /revert command
2. WHERE documentation or comments reference /revert or auto-save, THE Extension SHALL update or remove those references

### Requirement 8

**User Story:** As a developer, I want to ensure document cleanup properly handles the removal of auto-save, so that no memory leaks or dangling timers remain

#### Acceptance Criteria

1. THE DocumentService clearDocument() method SHALL not call disableAutoSave() since the method no longer exists
2. THE DocumentService SHALL ensure no auto-save related cleanup is needed in any lifecycle methods
