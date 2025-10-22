import type { ChatMessage } from '../../shared/types/models';

interface UserMessageProps {
  message: ChatMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-blue-600 text-white rounded-lg px-4 py-2 shadow-sm">
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className="text-xs text-blue-100 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
