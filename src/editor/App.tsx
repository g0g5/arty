import { useState, useEffect } from 'react';
import { WorkspacePanel, TextEditorPanel, ChatPanel, ChatHistoryModal } from './components';
import type { ChatSession, ProviderProfile } from '../shared/types/models';
import type { ChatHistoryRecord } from '../shared/services/ChatHistoryService';
import { storageService } from '../shared/services/StorageService';
import { chatSessionManager } from '../shared/services/ChatSessionManager';
import { chatHistoryService } from '../shared/services/ChatHistoryService';
import { commandParserService } from '../shared/services/CommandParserService';
import { fileSystemService } from '../shared/services/FileSystemService';
import type { ExecutionContext, ChatContext } from '../shared/types/services';

// Interface for tracking file change history
interface FileChangeSnapshot {
  timestamp: number;
  content: string;
  messageId: string;
}

function App() {
  const [currentFile, setCurrentFile] = useState<{
    handle: FileSystemFileHandle;
    path: string;
  } | null>(null);

  const [workspace, setWorkspace] = useState<FileSystemDirectoryHandle | null>(null);

  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track file change history for revert functionality
  const [fileChangeHistory, setFileChangeHistory] = useState<FileChangeSnapshot[]>([]);

  // History modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ChatHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load providers and initialize session on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const loadedProviders = await storageService.getProviders();
        setProviders(loadedProviders);

        // Load chat history
        await chatHistoryService.loadHistory();

        // Create initial session with default model
        const defaultModel = loadedProviders.length > 0 && loadedProviders[0].models.length > 0
          ? `${loadedProviders[0].id}:${loadedProviders[0].models[0]}`
          : '';
        
        const session = chatSessionManager.createSession(defaultModel, true);
        setChatSession(session);
      } catch (error) {
        console.error('Failed to load providers:', error);
        setError('Failed to load provider configurations');
      }
    };

    loadProviders();
  }, []);

  // Subscribe to session events
  useEffect(() => {
    const unsubscribe = chatSessionManager.subscribe((event) => {
      switch (event.type) {
        case 'session_updated':
          if (chatSession && event.session.id === chatSession.id) {
            setChatSession({ ...event.session });
          }
          break;
        
        case 'error':
          setError(event.error);
          setIsLoading(false);
          break;
      }
    });

    return unsubscribe;
  }, [chatSession]);

  const handleFileSelect = (handle: FileSystemFileHandle, path: string) => {
    setCurrentFile({ handle, path });
  };

  const handleWorkspaceOpen = (handle: FileSystemDirectoryHandle) => {
    setWorkspace(handle);
  };

  const handleSendMessage = async (message: string) => {
    if (!chatSession) return;

    // Clear any previous errors
    setError(null);

    // Validate model selection
    if (!chatSession.selectedModel) {
      setError('Please select a model before sending a message');
      return;
    }

    // Parse provider and model from selectedModel
    const [providerId, modelName] = chatSession.selectedModel.split(':');
    const provider = providers.find(p => p.id === providerId);

    if (!provider) {
      setError('Selected provider not found');
      return;
    }

    // Set loading state
    setIsLoading(true);

    try {
      // Prepare execution context for tools
      const executionContext: ExecutionContext = {
        currentFile: currentFile?.handle || null,
        workspace: workspace,
      };

      // Send message through session manager
      await chatSessionManager.sendMessage(
        chatSession.id,
        message,
        provider,
        modelName,
        executionContext
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };



  const handleModelChange = (modelId: string) => {
    if (!chatSession) return;
    chatSessionManager.updateSession(chatSession.id, { selectedModel: modelId });
  };

  const handleToolsToggle = (enabled: boolean) => {
    if (!chatSession) return;
    chatSessionManager.updateSession(chatSession.id, { toolsEnabled: enabled });
  };

  const handleCommand = async (commandInput: string) => {
    if (!chatSession) return;

    // Parse the command
    const command = commandParserService.parseCommand(commandInput);

    if (!command) {
      setError('Invalid command');
      return;
    }

    try {
      // Create chat context for command execution
      const chatContext: ChatContext = {
        sessionId: chatSession.id,
        messages: chatSession.messages,
        currentFile: currentFile?.handle || null,
      };

      // Execute the command
      switch (command.type) {
        case 'new':
          handleNewCommand(chatContext);
          break;

        case 'revert':
          await handleRevertCommand(chatContext);
          break;

        default:
          setError(`Unknown command type: ${(command as any).type}`);
      }
    } catch (err) {
      console.error('Command execution failed:', err);
      setError(err instanceof Error ? err.message : 'Command execution failed');
    }
  };

  const handleNewChat = async () => {
    if (!chatSession) return;

    try {
      // Archive current session if it has messages
      if (chatSession.messages.length > 0) {
        await chatHistoryService.archiveSession(chatSession);
      }

      // Create a new chat session with same settings
      const newSession = chatSessionManager.createSession(
        chatSession.selectedModel,
        chatSession.toolsEnabled
      );
      
      setChatSession(newSession);

      // Clear file change history for new session
      setFileChangeHistory([]);

      // Clear any errors
      setError(null);
    } catch (err) {
      console.error('Failed to create new chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new chat');
    }
  };

  const handleShowHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const records = await chatHistoryService.getArchivedSessions();
      setHistoryRecords(records);
      setIsHistoryModalOpen(true);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRestoreSession = async (historyId: string) => {
    if (!chatSession) return;

    try {
      setIsLoadingHistory(true);

      // Archive current session if it has messages
      if (chatSession.messages.length > 0) {
        await chatHistoryService.archiveSession(chatSession);
      }

      // Restore the selected session
      const restoredSession = await chatHistoryService.restoreSession(historyId);
      
      // Create a new session with the restored data
      const newSession = chatSessionManager.createSession(
        restoredSession.selectedModel,
        restoredSession.toolsEnabled
      );

      // Manually set the messages and other properties
      const session = chatSessionManager.getSession(newSession.id);
      if (session) {
        session.messages = restoredSession.messages;
        session.createdAt = restoredSession.createdAt;
      }

      setChatSession({ ...newSession, messages: restoredSession.messages });

      // Clear file change history for restored session
      setFileChangeHistory([]);

      // Close the modal
      setIsHistoryModalOpen(false);

      // Clear any errors
      setError(null);
    } catch (err) {
      console.error('Failed to restore session:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore chat session');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    try {
      await chatHistoryService.deleteArchivedSession(historyId);
      
      // Refresh the history list
      const records = await chatHistoryService.getArchivedSessions();
      setHistoryRecords(records);
    } catch (err) {
      console.error('Failed to delete history:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete chat history');
    }
  };

  const handleNewCommand = (_context: ChatContext) => {
    // Delegate to handleNewChat
    handleNewChat();
  };

  const handleRevertCommand = async (_context: ChatContext) => {
    if (!chatSession) return;

    // Check if there's a current file
    if (!currentFile) {
      throw new Error('No file is currently open to revert changes');
    }

    // Check if there's any change history
    if (fileChangeHistory.length === 0) {
      throw new Error('No file modifications found to revert');
    }

    // Get the last snapshot
    const lastSnapshot = fileChangeHistory[fileChangeHistory.length - 1];

    try {
      // Restore the file content from the snapshot
      await fileSystemService.writeFile(currentFile.handle, lastSnapshot.content);

      // Remove the last snapshot from history
      setFileChangeHistory((prev) => prev.slice(0, -1));

      // Trigger a re-render of the text editor by updating the file reference
      setCurrentFile({ ...currentFile });

    } catch (err) {
      console.error('Failed to revert file:', err);
      throw new Error('Failed to revert file changes: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="h-screen w-full flex bg-gray-50">
      {/* Workspace Panel - 25% width */}
      <div className="w-1/4 h-full border-r border-gray-200">
        <WorkspacePanel
          onFileSelect={handleFileSelect}
          onWorkspaceOpen={handleWorkspaceOpen}
        />
      </div>

      {/* Text Editor Panel - 50% width */}
      <div className="w-1/2 h-full">
        <TextEditorPanel
          fileHandle={currentFile?.handle || null}
          filePath={currentFile?.path || null}
        />
      </div>

      {/* Chat Panel - 25% width */}
      <div className="w-1/4 h-full border-l border-gray-200">
        {chatSession && (
          <ChatPanel
            session={chatSession}
            providers={providers}
            onSendMessage={handleSendMessage}
            onCommand={handleCommand}
            onModelChange={handleModelChange}
            onToolsToggle={handleToolsToggle}
            onNewChat={handleNewChat}
            onShowHistory={handleShowHistory}
            isLoading={isLoading}
            error={error}
            onErrorDismiss={() => setError(null)}
          />
        )}
      </div>

      {/* Chat History Modal */}
      <ChatHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onRestore={handleRestoreSession}
        onDelete={handleDeleteHistory}
        historyRecords={historyRecords}
        isLoading={isLoadingHistory}
      />
    </div>
  );
}

export default App;
