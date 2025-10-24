# Design Document

## Overview

This design addresses the cursor position bug by introducing position-aware content operations to the DocumentService and refactoring the TextEditorPanel's content change handling to properly track and preserve cursor position. The solution involves:

1. Adding new position-based methods to DocumentService (insertAt, deleteRange, replaceRange)
2. Refactoring TextEditorPanel to calculate precise content changes based on cursor/selection position
3. Implementing cursor position restoration after content updates
4. Maintaining backward compatibility with existing append/replace methods

The design prioritizes minimal changes to the existing architecture while fixing the core issue and improving the overall editing experience.

## Architecture

### Current Architecture Issues

The current implementation has a fundamental flaw in how content changes flow from UI to service:

```
User types at cursor position
  ↓
TextEditorPanel.handleContentChange receives full new content
  ↓
Logic checks: newContent.length > currentContent.length?
  ↓
YES → appendContent(difference) [WRONG: ignores cursor position]
NO → replaceContent(oldContent, newContent) [INEFFICIENT: replaces entire content]
  ↓
DocumentService updates content and emits event
  ↓
TextEditorPanel receives event and updates textarea
  ↓
Cursor position is lost (textarea re-renders)
```

### Proposed Architecture

The new architecture introduces position-aware operations:

```
User types at cursor position
  ↓
TextEditorPanel captures cursor position and selection range BEFORE change
  ↓
TextEditorPanel.handleContentChange receives new content
  ↓
Calculate precise change: compare old vs new content at cursor position
  ↓
Determine operation type:
  - Insertion: content added at cursor
  - Deletion: content removed at cursor/selection
  - Replacement: selection replaced with new content
  ↓
Call appropriate DocumentService method with position:
  - insertAt(position, content)
  - deleteRange(start, end)
  - replaceRange(start, end, content)
  ↓
DocumentService updates content and emits event
  ↓
TextEditorPanel receives event, updates textarea, and restores cursor position
```

## Components and Interfaces

### 1. DocumentService Extensions

Add new position-aware methods to the IDocumentService interface:

```typescript
export interface IDocumentService {
  // ... existing methods ...
  
  // New position-aware methods
  insertAt(position: number, content: string): Promise<void>;
  deleteRange(start: number, end: number): Promise<void>;
  replaceRange(start: number, end: number, replacement: string): Promise<void>;
}
```

**Method Specifications:**

- `insertAt(position, content)`: Inserts content at the specified position
  - Validates position is within bounds [0, content.length]
  - Sanitizes the content
  - Updates document content: `content.slice(0, position) + sanitized + content.slice(position)`
  - Marks document as dirty
  - Creates snapshot
  - Emits content_changed event

- `deleteRange(start, end)`: Deletes content from start to end position
  - Validates start >= 0 and end <= content.length and start <= end
  - Updates document content: `content.slice(0, start) + content.slice(end)`
  - Marks document as dirty
  - Creates snapshot
  - Emits content_changed event

- `replaceRange(start, end, replacement)`: Replaces content in range with new content
  - Validates range bounds
  - Sanitizes replacement content
  - Updates document content: `content.slice(0, start) + sanitized + content.slice(end)`
  - Marks document as dirty
  - Creates snapshot
  - Emits content_changed event

### 2. TextEditorPanel Refactoring

Refactor the content change handling to track cursor position and calculate precise changes:

```typescript
interface CursorState {
  start: number;
  end: number;
}

// New state to track cursor position
const [cursorPosition, setCursorPosition] = useState<CursorState>({ start: 0, end: 0 });
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Capture cursor position before content changes
const handleBeforeInput = useCallback(() => {
  if (textareaRef.current) {
    setCursorPosition({
      start: textareaRef.current.selectionStart,
      end: textareaRef.current.selectionEnd
    });
  }
}, []);

// Calculate and apply precise content changes
const handleContentChange = useCallback(async (newContent: string) => {
  try {
    const currentContent = documentService.getContent();
    const { start, end } = cursorPosition;
    
    // Determine the type of change
    if (newContent.length > currentContent.length) {
      // Content was inserted
      const insertedContent = newContent.slice(start, start + (newContent.length - currentContent.length));
      await documentService.insertAt(start, insertedContent);
      
      // Update cursor position for restoration
      setCursorPosition({ 
        start: start + insertedContent.length, 
        end: start + insertedContent.length 
      });
    } else if (newContent.length < currentContent.length) {
      // Content was deleted
      const deleteEnd = end + (currentContent.length - newContent.length);
      await documentService.deleteRange(start, deleteEnd);
      
      // Update cursor position for restoration
      setCursorPosition({ start, end: start });
    } else if (start !== end) {
      // Selection was replaced (same length but different content)
      const replacementContent = newContent.slice(start, end);
      await documentService.replaceRange(start, end, replacementContent);
      
      // Update cursor position for restoration
      setCursorPosition({ 
        start: start + replacementContent.length, 
        end: start + replacementContent.length 
      });
    }
  } catch (err) {
    setContent(newContent);
    console.error('Error updating content:', err);
  }
}, [cursorPosition]);

// Restore cursor position after content updates
useEffect(() => {
  if (textareaRef.current && cursorPosition) {
    textareaRef.current.setSelectionRange(cursorPosition.start, cursorPosition.end);
  }
}, [content, cursorPosition]);
```

### 3. Backward Compatibility

The existing `appendContent` and `replaceContent` methods will remain unchanged to maintain compatibility with tool execution and other parts of the system. The new position-aware methods are additions, not replacements.

## Data Models

### CursorState

```typescript
interface CursorState {
  start: number;  // Selection start position (or cursor position if no selection)
  end: number;    // Selection end position (or cursor position if no selection)
}
```

### ContentChange (internal calculation)

```typescript
interface ContentChange {
  type: 'insert' | 'delete' | 'replace';
  start: number;
  end: number;
  content?: string;  // For insert and replace operations
}
```

## Error Handling

### DocumentService Error Cases

1. **Invalid Position**: Position < 0 or > content.length
   - Throw ServiceError with code VALIDATION_ERROR
   - Message: "Invalid position: must be between 0 and {content.length}"

2. **Invalid Range**: start > end or start < 0 or end > content.length
   - Throw ServiceError with code VALIDATION_ERROR
   - Message: "Invalid range: start must be <= end and within content bounds"

3. **Content Too Large**: After operation, content exceeds 10MB limit
   - Throw ServiceError with code DOCUMENT_TOO_LARGE
   - Message: "Content too large (exceeds 10MB limit)"

4. **No Document Loaded**: Operation called when no document is loaded
   - Throw ServiceError with code NO_DOCUMENT_LOADED
   - Message: "No document is currently loaded"

### TextEditorPanel Error Handling

1. **DocumentService Errors**: Catch and display in error state
2. **Cursor Position Calculation Errors**: Fall back to updating local state only
3. **Content Synchronization Errors**: Log to console and attempt recovery on next change

## Testing Strategy

### Unit Tests for DocumentService

1. **insertAt method**:
   - Insert at beginning (position 0)
   - Insert at end (position = content.length)
   - Insert in middle
   - Invalid position (negative, > length)
   - Content sanitization (null bytes, line endings)
   - Snapshot creation
   - Event emission

2. **deleteRange method**:
   - Delete from beginning
   - Delete from end
   - Delete from middle
   - Delete entire content (0, length)
   - Invalid ranges (start > end, negative, out of bounds)
   - Snapshot creation
   - Event emission

3. **replaceRange method**:
   - Replace at beginning
   - Replace at end
   - Replace in middle
   - Replace with longer content
   - Replace with shorter content
   - Invalid ranges
   - Content sanitization
   - Snapshot creation
   - Event emission

### Integration Tests for TextEditorPanel

1. **Cursor position preservation**:
   - Type at beginning of document
   - Type at end of document
   - Type in middle of document
   - Delete characters
   - Select and replace text
   - Paste content at cursor

2. **Content synchronization**:
   - Verify DocumentService content matches textarea
   - Verify cursor position after updates
   - Verify dirty state updates correctly

3. **Edge cases**:
   - Rapid typing (multiple changes in quick succession)
   - Large paste operations
   - Undo/redo behavior (browser native)
   - Multi-line operations

### Manual Testing Scenarios

1. Open a file and type at various positions
2. Select text and type to replace
3. Use keyboard shortcuts (Ctrl+A, Ctrl+X, Ctrl+V)
4. Test with large files (> 1MB)
5. Test with files containing special characters
6. Verify save functionality still works correctly
7. Verify snapshot/revert functionality still works

## Implementation Notes

### Performance Considerations

1. **Cursor Position Tracking**: Use refs to avoid unnecessary re-renders
2. **Content Comparison**: Only calculate differences when necessary
3. **Event Throttling**: Consider debouncing rapid changes if performance issues arise
4. **String Operations**: Use slice() for efficient string manipulation

### Browser Compatibility

- `selectionStart` and `selectionEnd` are supported in all modern browsers
- `setSelectionRange()` is supported in all modern browsers
- No polyfills required

### Future Enhancements

1. **Undo/Redo Stack**: Implement custom undo/redo using snapshots
2. **Collaborative Editing**: Position-aware operations enable operational transformation
3. **Syntax Highlighting**: Cursor-aware operations work well with syntax highlighting libraries
4. **Performance Optimization**: Implement virtual scrolling for very large files
