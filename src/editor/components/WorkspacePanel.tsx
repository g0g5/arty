/**
 * Workspace Panel Component
 * Displays workspace file tree and folder open button
 */

import { useState } from 'react';
import { fileSystemService } from '../../shared/services';
import type { FileTreeNode } from '../../shared/types';
import WorkspaceTree from './WorkspaceTree.tsx';

interface WorkspacePanelProps {
  onFileSelect: (handle: FileSystemFileHandle, path: string) => void;
  onWorkspaceOpen?: (handle: FileSystemDirectoryHandle) => void;
}

function WorkspacePanel({ onFileSelect, onWorkspaceOpen }: WorkspacePanelProps) {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenFolder = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Open workspace directory
      const dirHandle = await fileSystemService.openWorkspace();
      setRootHandle(dirHandle);

      // Notify parent component
      if (onWorkspaceOpen) {
        onWorkspaceOpen(dirHandle);
      }

      // Get file tree
      const tree = await fileSystemService.getFileTree(dirHandle);
      setFileTree(tree);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open workspace';
      setError(errorMessage);
      console.error('Error opening workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (path: string) => {
    if (!rootHandle) return;

    try {
      // Find file handle by path
      const fileHandle = await fileSystemService.findFile(rootHandle, path);
      onFileSelect(fileHandle, path);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open file';
      setError(errorMessage);
      console.error('Error opening file:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleOpenFolder}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Opening...' : rootHandle ? 'Change Workspace' : 'Open Folder'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto p-2">
        {rootHandle && fileTree.length > 0 ? (
          <WorkspaceTree fileTree={fileTree} onFileSelect={handleFileSelect} />
        ) : rootHandle && fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No files in workspace
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            Open a folder to view files
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspacePanel;
