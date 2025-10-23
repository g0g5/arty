interface ChatHeaderProps {
    selectedModel: string;
    toolsEnabled: boolean;
    availableModels: Array<{ id: string; name: string; providerId: string }>;
    onModelChange: (modelId: string) => void;
    onToolsToggle: (enabled: boolean) => void;
    onNewChat?: () => void;
    onShowHistory?: () => void;
}

export function ChatHeader({
    selectedModel,
    toolsEnabled,
    availableModels,
    onModelChange,
    onToolsToggle,
    onNewChat,
    onShowHistory,
}: ChatHeaderProps) {
    return (
        <div className="border-b border-gray-200 p-4 space-y-3">
            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onNewChat}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    title="Start a new chat session"
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </span>
                </button>
                <button
                    onClick={onShowHistory}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    title="View chat history"
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                    </span>
                </button>
            </div>
            {/* Model Selector */}
            <div>
                <label htmlFor="model-selector" className="block text-xs font-medium text-gray-700 mb-1">
                    Model
                </label>
                <select
                    id="model-selector"
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                    {availableModels.length === 0 ? (
                        <option value="">No models configured</option>
                    ) : (
                        availableModels.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))
                    )}
                </select>
            </div>

            {/* Tools Toggle */}
            <div className="flex items-center justify-between">
                <label htmlFor="tools-toggle" className="text-xs font-medium text-gray-700">
                    Enable Tools
                </label>
                <button
                    id="tools-toggle"
                    type="button"
                    role="switch"
                    aria-checked={toolsEnabled}
                    onClick={() => onToolsToggle(!toolsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${toolsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${toolsEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>
        </div>
    );
}
