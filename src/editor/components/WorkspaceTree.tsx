/**
 * Workspace Tree Component
 * Displays hierarchical file structure
 */

import type { FileTreeNode } from '../../shared/types';
import FileNode from './FileNode.tsx';
import FolderNode from './FolderNode.tsx';

interface WorkspaceTreeProps {
  fileTree: FileTreeNode[];
  onFileSelect: (path: string) => void;
}

function WorkspaceTree({ fileTree, onFileSelect }: WorkspaceTreeProps) {
  return (
    <div className="space-y-1">
      {fileTree.map((node) => (
        node.type === 'directory' ? (
          <FolderNode
            key={node.path}
            node={node}
            onFileSelect={onFileSelect}
          />
        ) : (
          <FileNode
            key={node.path}
            node={node}
            onSelect={() => onFileSelect(node.path)}
          />
        )
      ))}
    </div>
  );
}

export default WorkspaceTree;
