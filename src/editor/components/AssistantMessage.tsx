import type { ChatMessage } from '../../shared/types/models';

interface AssistantMessageProps {
  message: ChatMessage;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  // Helper to format tool result for display
  const formatToolResult = (result: any): string => {
    if (typeof result === 'string') {
      // Truncate long strings
      return result.length > 500 ? result.substring(0, 500) + '...' : result;
    }
    return JSON.stringify(result, null, 2);
  };

  // Helper to determine if tool execution was successful
  const isToolSuccess = (toolCall: any): boolean => {
    if (!toolCall.result) return false;
    if (toolCall.result.error) return false;
    if (toolCall.result.success === false) return false;
    return true;
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {/* Tool Calls (displayed before message content) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.toolCalls.map((toolCall) => {
              const hasResult = toolCall.result !== undefined;
              const isSuccess = isToolSuccess(toolCall);
              const hasError = toolCall.result?.error;

              return (
                <div
                  key={toolCall.id}
                  className={`rounded-md px-3 py-2 border ${
                    hasError
                      ? 'bg-red-50 border-red-200'
                      : isSuccess
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Tool icon */}
                    <svg
                      className={`w-4 h-4 ${
                        hasError
                          ? 'text-red-600'
                          : isSuccess
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {hasError ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ) : isSuccess ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                      )}
                    </svg>

                    {/* Tool name */}
                    <span
                      className={`text-xs font-medium ${
                        hasError
                          ? 'text-red-900'
                          : isSuccess
                          ? 'text-green-900'
                          : 'text-blue-900'
                      }`}
                    >
                      {toolCall.name}
                    </span>

                    {/* Status badge */}
                    {hasResult && (
                      <span
                        className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                          hasError
                            ? 'bg-red-100 text-red-700'
                            : isSuccess
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {hasError ? 'Failed' : isSuccess ? 'Success' : 'Executed'}
                      </span>
                    )}
                  </div>

                  {/* Tool arguments */}
                  <div className="text-xs text-gray-600 mt-1 mb-2">
                    <span className="font-medium">Arguments:</span>{' '}
                    <span className="font-mono">
                      {JSON.stringify(toolCall.arguments)}
                    </span>
                  </div>

                  {/* Tool result */}
                  {hasResult && (
                    <div
                      className={`text-xs mt-2 p-2 rounded font-mono whitespace-pre-wrap ${
                        hasError
                          ? 'bg-red-100 text-red-800'
                          : isSuccess
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {hasError ? (
                        <div>
                          <span className="font-bold">Error:</span> {toolCall.result.error}
                        </div>
                      ) : (
                        formatToolResult(toolCall.result)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Message Content */}
        {message.content && (
          <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 shadow-sm">
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
