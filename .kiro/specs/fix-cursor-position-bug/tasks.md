# Implementation Plan

- [x] 1. Extend DocumentService with position-aware methods





  - Add `insertAt`, `deleteRange`, and `replaceRange` methods to DocumentService class
  - Implement position validation logic for all three methods
  - Ensure content sanitization is applied in insertAt and replaceRange
  - Implement proper error handling with ServiceError for invalid positions/ranges
  - Ensure snapshot creation and content_changed event emission for all methods
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Write unit tests for position-aware DocumentService methods






  - Test insertAt with various positions (beginning, middle, end, invalid)
  - Test deleteRange with various ranges (beginning, middle, end, invalid)
  - Test replaceRange with various ranges and replacement content
  - Test content sanitization in new methods
  - Test snapshot creation and event emission
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Update IDocumentService interface type definition





  - Add type definitions for insertAt, deleteRange, and replaceRange methods to the IDocumentService interface in services.ts
  - Ensure parameter types are properly defined (position: number, content: string, etc.)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Refactor TextEditorPanel to track cursor position





  - Add cursorPosition state to track selection start and end
  - Create textareaRef using useRef for direct DOM access
  - Implement handleBeforeInput callback to capture cursor position before changes
  - Add onBeforeInput event handler to textarea element
  - Attach ref to textarea element
  - _Requirements: 4.1, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Implement precise content change calculation in TextEditorPanel





  - Refactor handleContentChange to calculate the exact type of change (insert, delete, replace)
  - Implement logic to detect insertions based on content length and cursor position
  - Implement logic to detect deletions based on content length and cursor position
  - Implement logic to detect replacements when selection exists
  - Call appropriate DocumentService method (insertAt, deleteRange, replaceRange) based on change type
  - Update cursorPosition state after each operation for restoration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.2, 4.3_

- [x] 5. Implement cursor position restoration after content updates





  - Add useEffect hook that runs when content or cursorPosition changes
  - Use textareaRef.current.setSelectionRange to restore cursor position
  - Ensure cursor is positioned correctly after insertions (after inserted content)
  - Ensure cursor is positioned correctly after deletions (at deletion point)
  - Ensure cursor is positioned correctly after replacements (after replacement content)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.4_

- [x] 6. Write integration tests for TextEditorPanel cursor behavior







  - Test typing at beginning, middle, and end of document
  - Test deletion at various positions
  - Test selection and replacement
  - Test paste operations at cursor
  - Test cursor position preservation after each operation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [x] 7. Add error handling for edge cases




  - Add try-catch in handleContentChange to handle DocumentService errors gracefully
  - Implement fallback to local state update if DocumentService operations fail
  - Add error logging for debugging cursor position calculation issues
  - Ensure error state is displayed to user when operations fail
  - _Requirements: 4.5_

- [ ]* 8. Perform manual testing of cursor position fix
  - Test typing at various positions in a document
  - Test selecting text and typing to replace
  - Test keyboard shortcuts (Ctrl+A, Ctrl+X, Ctrl+V)
  - Test with large files to verify performance
  - Test save functionality to ensure it still works correctly
  - Verify snapshot/revert functionality is not affected
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_
