# Tool Calling Loop Bug Fix

## Problem
The editor's chat panel was experiencing infinite tool calling loops where the LLM would repeatedly call the same tools without making progress.

## Root Cause
The bug was in the `handleToolCalls` function in `src/editor/App.tsx`. The issue was related to **stale state closure** in React:

1. When tool calls were executed, the function would update the chat session state with tool results
2. Then it would try to continue the conversation by sending messages back to the LLM
3. However, it was reading `chatSession.messages` from the closure, which contained **stale/old state**
4. This meant the LLM never received the tool results properly, causing it to repeat the same tool calls

## The Fix
The fix ensures we build the messages array **before** any state updates to avoid empty arrays:

```typescript
// BEFORE (buggy - caused infinite loops):
setChatSession((prev) => ({
  ...prev,
  messages: prev.messages.map(msg =>
    msg.id === messageId
      ? { ...msg, toolCalls: updatedToolCalls }
      : msg
  ),
}));

// Later, reading stale state from closure:
const messagesWithToolResults = chatSession.messages.map(...);

// ATTEMPTED FIX (caused "Empty input messages" error):
let messagesWithToolResults: ChatMessage[] = [];

setChatSession((prev) => {
  messagesWithToolResults = prev.messages.map(...);
  return { ...prev, messages: messagesWithToolResults };
});
// Problem: messagesWithToolResults could remain empty if callback doesn't execute

// FINAL FIX (correct):
// Build messages from current state BEFORE any async operations
const messagesWithToolResults = chatSession.messages.map(msg =>
  msg.id === messageId
    ? { ...msg, toolCalls: updatedToolCalls }
    : msg
);

// Then update state
setChatSession((prev) => ({
  ...prev,
  messages: messagesWithToolResults,
}));

// Now messagesWithToolResults is guaranteed to have content
```

## How It Works (Correct Flow)
Following the OpenAI tool calling pattern from `example-led.js`:

1. **User sends message** → LLM responds with `tool_calls`
2. **Execute tools** → Get results
3. **Send back to LLM**: 
   - Original messages
   - Assistant message with `tool_calls`
   - Tool result messages (role: 'tool')
4. **LLM responds** with final answer or more tool calls
5. If more tool calls, repeat from step 2

The key insight from `example-led.js` is that the conversation history must include:
- The assistant's message with `tool_calls`
- Separate `tool` role messages with the results

The `LLMService.convertToOpenAIMessages()` function already handles this correctly by converting `ChatMessage` objects with `toolCalls[].result` into separate OpenAI tool messages.

## Issues Encountered During Fix

### Issue 1: Infinite Loop (Original Bug)
**Symptom**: LLM repeatedly calls the same tools without making progress
**Cause**: Stale state from React closure - tool results weren't being included in follow-up messages
**Fix**: Build messages array from current state before state updates

### Issue 2: Empty Input Messages Error
**Symptom**: "Failed to continue conversation after tool execution: LLMServiceError: Empty input messages"
**Cause**: Initializing `messagesWithToolResults` as empty array and trying to populate it inside `setChatSession` callback
**Fix**: Build the messages array directly from `chatSession.messages` BEFORE calling `setChatSession`

## Testing
To verify the fix works:
1. Open a file in the editor
2. Ask the LLM to make multiple edits (e.g., "add a function and then add a comment")
3. The LLM should execute tools, receive results, and provide a final response without looping or errors
