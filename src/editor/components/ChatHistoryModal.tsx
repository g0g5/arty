import { useState, useEffect } from 'react';
import type { ChatHistoryRecord } from '../../shared/services';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (historyId: string) => void;
  onDelete: (historyId: string) => void;
  historyRecords: ChatHistoryRecord[];
  isLoading?: boolean;
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  onRestore,
  onDelete,
  historyRecords,
  isLoading = false,
}: ChatHistoryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return minutes <= 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (days < 7) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const handleRestore = (historyId: string) => {
    onRestore(historyId);
    onClose();
  };

  const handleDelete = (historyId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chat history?')) {
      onDelete(historyId);
      if (selectedId === historyId) {
        setSelectedId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No chat history yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new chat and it will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyRecords.map((record) => (
                <div
                  key={record.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedId === record.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedId(record.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {record.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{record.messageCount} messages</span>
                        <span>•</span>
                        <span>{formatTimestamp(record.archivedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Delete"
                      title="Delete this chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedId && handleRestore(selectedId)}
            disabled={!selectedId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Restore Selected
          </button>
        </div>
      </div>
    </div>
  );
}
