/**
 * File Node Component
 * Displays a file in the workspace tree
 */

import type { FileTreeNode } from '../../shared/types';

interface FileNodeProps {
  node: FileTreeNode;
  onSelect: () => void;
}

function FileNode({ node, onSelect }: FileNodeProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-2 group"
    >
      {/* File icon */}
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>

      {/* File name */}
      <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
        {node.name}
      </span>
    </button>
  );
}

export default FileNode;
