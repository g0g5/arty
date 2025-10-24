# Design Document

## Overview

This design document outlines the approach for removing the auto-save functionality and /revert command from the document management system. The removal simplifies the codebase by eliminating features that were not part of the original design intent. The changes affect multiple layers of the application including services, type definitions, tests, and user interface components.

The removal is straightforward as these features are relatively isolated and do not have deep dependencies throughout the codebase. The main impact areas are:
- DocumentService and its interface
- CommandParserService and command types
- Type definitions for storage and services
- Test suites
- UI placeholder text

## Architecture

### Affected Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Layer                          │
│  ┌────────────────┐                                         │
│  │  ChatInput     │ - Update placeholder text               │
│  └────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ DocumentService  │        │ CommandParserService │      │
│  │ - Remove auto-   │        │ - Remove /revert     │      │
│  │   save methods   │        │   command parsing    │      │
│  │ - Remove timers  │        │ - Update validation  │      │
│  └──────────────────┘        └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Type Layer                               │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ IDocumentService │        │ AppSettings          │      │
│  │ - Remove auto-   │        │ - Remove autoSave    │      │
│  │   save interface │        │ - Remove interval    │      │
│  └──────────────────┘        └──────────────────────┘      │
│  ┌──────────────────┐        ┌──────────────────────┐      │
│  │ DocumentSnapshot │        │ Command              │      │
│  │ - Update trigger │        │ - Remove revert type │      │
│  └──────────────────┘        └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Removal Strategy

The removal follows a bottom-up approach:
1. Remove implementation code from services
2. Update type definitions and interfaces
3. Remove related tests
4. Update UI components and documentation

This order ensures that we don't leave orphaned code or broken references.

## Components and Interfaces

### DocumentService Changes

**Methods to Remove:**
- `enableAutoSave(intervalMs: number): void`
- `disableAutoSave(): void`
- `performAutoSave(): Promise<void>` (private)

**Properties to Remove:**
- `autoSaveInterval: NodeJS.Timeout | null`
- `debouncedAutoSave: (() => void) | null`

**Methods to Update:**
- `clearDocument()`: Remove the call to `disableAutoSave()`

**Snapshot Creation:**
- Remove any calls to `createSnapshot('auto_save')`
- Keep `createSnapshot('manual_save')` and `createSnapshot('tool_execution')`

### IDocumentService Interface Changes

**Methods to Remove:**
```typescript
enableAutoSave(intervalMs: number): void;
disableAutoSave(): void;
```

The interface will retain all other methods for document management, content operations, and manual saving.

### CommandParserService Changes

**Methods to Remove:**
- `executeRevertCommand(context: ChatContext): void` (private)
- `findLastModifyingMessage(messages: ChatMessage[]): ChatMessage | null` (private)

**Methods to Update:**
- `parseCommand(input: string)`: Remove the 'revert' case from the switch statement
- `validateCommand(input: string)`: Update error message to say "Available commands: /new" instead of "/new, /revert"

### Type Definition Changes

**src/shared/types/services.ts:**

Update Command type:
```typescript
// Before
export type Command = 
  | { type: "new" }
  | { type: "revert" };

// After
export type Command = 
  | { type: "new" };
```

Update DocumentSnapshot interface:
```typescript
// Before
triggerEvent: 'manual_save' | 'tool_execution' | 'auto_save';

// After
triggerEvent: 'manual_save' | 'tool_execution';
```

**src/shared/types/storage.ts:**

Update AppSettings interface:
```typescript
// Before
export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  defaultProvider?: string;
  defaultModel?: string;
  toolsEnabledByDefault?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

// After
export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  defaultProvider?: string;
  defaultModel?: string;
  toolsEnabledByDefault?: boolean;
}
```

### StorageService Changes

**Default Settings Update:**

Remove auto-save related properties from default settings initialization in:
- `getSettings()` method
- Any migration or initialization code

Update from:
```typescript
{
  theme: 'system',
  toolsEnabledByDefault: true,
  autoSave: true,
  autoSaveInterval: 5000
}
```

To:
```typescript
{
  theme: 'system',
  toolsEnabledByDefault: true
}
```

### UI Component Changes

**ChatInput Component:**

Update placeholder text from:
```typescript
placeholder="Type a message... (use /new or /revert for commands)"
```

To:
```typescript
placeholder="Type a message... (use /new to start a new session)"
```

## Data Models

No changes to core data models are required. The DocumentState interface remains unchanged as it still needs to track snapshots for the revertToSnapshot functionality (which is different from the /revert command and is still needed for manual snapshot management).

## Error Handling

No new error handling is required. We are removing functionality, so error cases are also being removed:
- No more auto-save errors
- No more "no changes to revert" errors from /revert command

Existing error handling for manual save operations remains unchanged.

## Testing Strategy

### Tests to Remove

**DocumentService.test.ts:**
- Remove entire `describe('Auto-save Functionality', ...)` block
- This includes tests for:
  - `enableAutoSave()` with custom interval
  - Auto-save when document is not dirty
  - `disableAutoSave()`
  - Auto-save error handling
  - Clearing existing interval when re-enabling

**CommandParserService.test.ts:**
- Remove tests for parsing `/revert` command
- Remove tests for executing `/revert` command
- Update validation tests to not expect `/revert` in available commands
- Update case-insensitive tests to remove `/revert` examples
- Update command with trailing text tests to remove `/revert` examples

**Integration Tests (e2e.test.ts):**
- Remove `describe('Document Service Auto-Save Integration', ...)` block
- Remove any other tests that call `enableAutoSave()` or `disableAutoSave()`

### Tests to Update

**CommandParserService.test.ts:**
- Update error message assertions in validation tests to expect only `/new` in available commands

**DocumentService.test.ts:**
- Verify that `clearDocument()` still works correctly without calling `disableAutoSave()`

### Verification Strategy

After removal, verify:
1. All tests pass
2. No TypeScript compilation errors
3. No references to removed methods in the codebase
4. Documents can still be saved manually
5. The /new command still works
6. Snapshots are still created for manual saves and tool executions

## Implementation Notes

### Order of Changes

1. **Phase 1: Service Implementation**
   - Remove auto-save methods from DocumentService
   - Remove /revert command from CommandParserService
   - Update clearDocument() to not call disableAutoSave()

2. **Phase 2: Type Definitions**
   - Update IDocumentService interface
   - Update Command type
   - Update DocumentSnapshot triggerEvent type
   - Update AppSettings interface

3. **Phase 3: Storage Service**
   - Remove auto-save properties from default settings
   - Update any initialization code

4. **Phase 4: Tests**
   - Remove auto-save tests
   - Remove /revert command tests
   - Update validation tests

5. **Phase 5: UI Components**
   - Update ChatInput placeholder text
   - Remove any other references in comments or documentation

### Backward Compatibility

Users who have existing settings with `autoSave` and `autoSaveInterval` properties will not experience errors. These properties will simply be ignored. We do not need to write migration code to remove them from existing user settings, as they will not cause any issues.

### Performance Impact

Removing auto-save will have minimal performance impact:
- Slightly reduced memory usage (no timer or debounced function)
- No periodic file system writes
- Reduced CPU usage (no interval checks)

The user experience remains the same as documents are loaded in memory and only saved on explicit user action.

## Migration Considerations

No data migration is required. The removal is purely code-based and does not affect stored data structures. Existing snapshots in memory will continue to work, and the snapshot system remains functional for manual revert operations through the UI (if such a feature exists separately from the /revert command).
