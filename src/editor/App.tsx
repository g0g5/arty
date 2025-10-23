import { useState, useEffect } from 'react';
import { WorkspacePanel, TextEditorPanel, ChatPanel, ChatHistoryModal } from './components';
import type { ChatSession, ProviderProfile } from '../shared/types/models';
import type { 
  ChatHistoryRecord, 
  ExecutionContext, 
  ChatContext 
} from '../shared/services';
import { 
  storageService, 
  chatSessionManager, 
  chatHistoryService, 
  commandParserService, 
  documentService 
} from '../shared/services';

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

    // Cleanup on unmount: clear chat messages but preserve DocumentService and history
    return () => {
      // Clear chat session messages when editor closes
      if (chatSession && chatSession.messages.length > 0) {
        // Archive the current session before clearing
        chatHistoryService.archiveSession(chatSession).catch(err => {
          console.error('Failed to archive session on cleanup:', err);
        });
      }
      
      // Note: DocumentService state is preserved (not cleared)
      // Note: Chat history is preserved in storage
      // This ensures workspace and document context remain across editor sessions
    };
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

  // Handle editor close/unload - preserve state but archive chat
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Archive current chat session if it has messages
      if (chatSession && chatSession.messages.length > 0) {
        try {
          await chatHistoryService.archiveSession(chatSession);
        } catch (err) {
          console.error('Failed to archive session on unload:', err);
        }
      }
      
      // DocumentService state is automatically preserved
      // Workspace context is maintained
      // Chat history is persisted in storage
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [chatSession]);

  const handleFileSelect = async (handle: FileSystemFileHandle, path: string) => {
    setCurrentFile({ handle, path });
    
    // Update DocumentService with the new file
    try {
      await documentService.setCurrentDocument(handle, path);
    } catch (err) {
      console.error('Failed to set current document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    }
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

    // Check if there's a current document
    const currentDoc = documentService.getCurrentDocument();
    if (!currentDoc) {
      throw new Error('No file is currently open to revert changes');
    }

    // Get snapshots from DocumentService
    const snapshots = documentService.getSnapshots();
    if (snapshots.length < 2) {
      throw new Error('No file modifications found to revert');
    }

    try {
      // Get the second-to-last snapshot (the one before the current state)
      const previousSnapshot = snapshots[snapshots.length - 2];
      
      // Revert to the previous snapshot
      await documentService.revertToSnapshot(previousSnapshot.id);

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
