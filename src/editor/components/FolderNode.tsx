/**
 * Folder Node Component
 * Displays a folder in the workspace tree with expand/collapse functionality
 */

import { useState } from 'react';
import type { FileTreeNode } from '../../shared/types';
import FileNode from './FileNode.tsx';

interface FolderNodeProps {
  node: FileTreeNode;
  onFileSelect: (path: string) => void;
}

function FolderNode({ node, onFileSelect }: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {/* Folder header */}
      <button
        onClick={toggleExpand}
        className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-2 group"
      >
        {/* Expand/collapse icon */}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>

        {/* Folder icon */}
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
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>

        {/* Folder name */}
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
          {node.name}
        </span>
      </button>

      {/* Children (when expanded) */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="ml-4 mt-1 space-y-1">
          {node.children.map((child) => (
            child.type === 'directory' ? (
              <FolderNode
                key={child.path}
                node={child}
                onFileSelect={onFileSelect}
              />
            ) : (
              <FileNode
                key={child.path}
                node={child}
                onSelect={() => onFileSelect(child.path)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default FolderNode;
