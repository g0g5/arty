import { useState, useRef, useEffect } from 'react';
import { commandParserService } from '../../shared/services/CommandParserService';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCommand?: (command: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onCommand, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isCommand, setIsCommand] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect and validate commands
  useEffect(() => {
    const trimmedInput = input.trim();
    const startsWithSlash = trimmedInput.startsWith('/');
    setIsCommand(startsWithSlash);
    
    // Validate command if it looks like one
    if (startsWithSlash && trimmedInput.length > 1) {
      const validation = commandParserService.validateCommand(trimmedInput);
      setCommandError(validation.valid ? null : validation.error || null);
    } else {
      setCommandError(null);
    }
  }, [input]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    
    if (!trimmedInput || disabled) {
      return;
    }

    // Check if it's a command
    const command = commandParserService.parseCommand(trimmedInput);
    
    if (command) {
      // It's a valid command - notify parent via onCommand callback
      if (onCommand) {
        onCommand(trimmedInput);
      }
    } else if (trimmedInput.startsWith('/')) {
      // Invalid command - don't send
      return;
    } else {
      // Regular message - send it
      onSend(trimmedInput);
    }
    
    // Clear input and reset state
    setInput('');
    setCommandError(null);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (use /new or /revert for commands)"
            disabled={disabled}
            rows={1}
            className={`w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              commandError
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : isCommand
                ? 'border-purple-300 focus:ring-purple-500 bg-purple-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            style={{ maxHeight: '120px', minHeight: '40px' }}
          />
          {isCommand && !commandError && (
            <div className="absolute top-1 right-2 text-xs text-purple-600 font-medium">
              Command
            </div>
          )}
          {commandError && (
            <div className="absolute top-1 right-2 text-xs text-red-600 font-medium">
              Invalid
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || !input.trim() || !!commandError}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
      {commandError && (
        <p className="text-xs text-red-600 mt-2">
          {commandError}
        </p>
      )}
      {!commandError && (
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      )}
    </div>
  );
}
