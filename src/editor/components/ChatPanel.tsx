import type { ChatSession, ProviderProfile } from '../../shared/types/models';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  session: ChatSession;
  providers: ProviderProfile[];
  onSendMessage: (message: string) => void;
  onCommand: (command: string) => void;
  onModelChange: (modelId: string) => void;
  onToolsToggle: (enabled: boolean) => void;
  onNewChat?: () => void;
  onShowHistory?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onErrorDismiss?: () => void;
}

export function ChatPanel({
  session,
  providers,
  onSendMessage,
  onCommand,
  onModelChange,
  onToolsToggle,
  onNewChat,
  onShowHistory,
  isLoading = false,
  error = null,
  onErrorDismiss,
}: ChatPanelProps) {
  // Build available models list from providers
  const availableModels = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      id: `${provider.id}:${model}`,
      name: `${provider.name} - ${model}`,
      providerId: provider.id,
    }))
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
      <ChatHeader
        selectedModel={session.selectedModel}
        toolsEnabled={session.toolsEnabled}
        availableModels={availableModels}
        onModelChange={onModelChange}
        onToolsToggle={onToolsToggle}
        onNewChat={onNewChat}
        onShowHistory={onShowHistory}
      />

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
          {onErrorDismiss && (
            <button
              onClick={onErrorDismiss}
              className="text-red-600 hover:text-red-800 ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={session.messages} isLoading={isLoading} />
      </div>

      {/* Chat Input */}
      <ChatInput onSend={onSendMessage} onCommand={onCommand} disabled={isLoading} />
    </div>
  );
}
