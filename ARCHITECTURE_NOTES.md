# Chat Session Architecture Refactor

## Problem
The original implementation had message history bugs due to React state closures. When tool calls were executed, the message history would be lost because:
1. State updates in React are asynchronous and batched
2. Closures captured stale state values
3. Tool calling workflow required multiple state updates in sequence

## Solution
Decoupled message handling from React state by creating a `ChatSessionManager` service:

### ChatSessionManager
- **Independent state**: Maintains message history outside React's state management
- **Event-driven**: Emits events that UI subscribes to for rendering
- **Complete workflow**: Handles the full tool calling cycle internally
- **No stale closures**: Direct access to current state, no closure issues

### Benefits
1. **Reliable message history**: Messages are never lost during tool execution
2. **Cleaner separation**: Business logic separated from UI concerns
3. **Testable**: Service can be tested independently
4. **Scalable**: Easy to add features like message persistence, undo/redo

### Message Flow
```
User Input
  ↓
ChatSessionManager.sendMessage()
  ↓
Add user message to session
  ↓
Call LLM with full history
  ↓
Stream response → emit events → UI updates
  ↓
Tool calls detected?
  ↓ Yes
Execute tools
  ↓
Update message with results
  ↓
Call LLM again with updated history (recursive)
  ↓
Continue until no more tool calls
```

### UI Responsibilities (App.tsx)
- Render current session state
- Subscribe to session events
- Handle user interactions
- Manage file change history (for revert)
- Display errors

### Service Responsibilities (ChatSessionManager)
- Maintain message history
- Coordinate LLM calls
- Execute tool calling workflow
- Emit state change events
- Handle errors in conversation flow

## Usage Example
```typescript
// Create session
const session = chatSessionManager.createSession(modelId, true);

// Subscribe to updates
chatSessionManager.subscribe((event) => {
  if (event.type === 'session_updated') {
    setChatSession({ ...event.session });
  }
});

// Send message (handles everything internally)
await chatSessionManager.sendMessage(
  sessionId,
  userMessage,
  provider,
  modelName,
  executionContext
);
```

## Files Changed
- `src/shared/services/ChatSessionManager.ts` - New service
- `src/editor/App.tsx` - Simplified to use the service
