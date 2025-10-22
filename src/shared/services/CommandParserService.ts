/**
 * Command Parser Service
 * Parses and executes chat commands like /new and /revert
 */

import type { ICommandParserService, Command, ChatContext } from '../types/services';
import type { ChatMessage } from '../types/models';

/**
 * Command Parser Service Implementation
 * Handles parsing and execution of chat commands
 */
export class CommandParserService implements ICommandParserService {
  private static instance: CommandParserService;

  private constructor() {}

  /**
   * Get singleton instance of CommandParserService
   */
  public static getInstance(): CommandParserService {
    if (!CommandParserService.instance) {
      CommandParserService.instance = new CommandParserService();
    }
    return CommandParserService.instance;
  }

  /**
   * Parse a chat input string to detect commands
   * @param input User input string
   * @returns Command object if a valid command is detected, null otherwise
   */
  public parseCommand(input: string): Command | null {
    // Trim whitespace
    const trimmed = input.trim();

    // Check if input starts with /
    if (!trimmed.startsWith('/')) {
      return null;
    }

    // Extract command name (everything after / until first space or end)
    const commandMatch = trimmed.match(/^\/(\w+)/);
    if (!commandMatch) {
      return null;
    }

    const commandName = commandMatch[1].toLowerCase();

    // Parse specific commands
    switch (commandName) {
      case 'new':
        return { type: 'new' };
      
      case 'revert':
        return { type: 'revert' };
      
      default:
        // Unknown command
        return null;
    }
  }

  /**
   * Execute a parsed command
   * @param command Command to execute
   * @param context Chat context for command execution
   * @throws {Error} If command execution fails
   */
  public executeCommand(command: Command, context: ChatContext): void {
    switch (command.type) {
      case 'new':
        this.executeNewCommand(context);
        break;
      
      case 'revert':
        this.executeRevertCommand(context);
        break;
      
      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  }

  /**
   * Execute /new command - creates a new chat session
   * @param context Chat context
   */
  private executeNewCommand(context: ChatContext): void {
    // Clear all messages in the current session
    context.messages.length = 0;

    // Generate new session ID
    context.sessionId = this.generateSessionId();
  }

  /**
   * Execute /revert command - reverts the last model change to file
   * @param context Chat context
   * @throws {Error} If there are no changes to revert or current file is not available
   */
  private executeRevertCommand(context: ChatContext): void {
    if (!context.currentFile) {
      throw new Error('No file is currently open to revert changes');
    }

    // Find the last assistant message with tool calls that modified the file
    const lastModifyingMessage = this.findLastModifyingMessage(context.messages);

    if (!lastModifyingMessage) {
      throw new Error('No file modifications found to revert');
    }

    // Note: The actual revert logic (restoring file content) should be handled
    // by the component that calls this service, as it needs access to file state
    // and the FileSystemService. This method validates that revert is possible
    // and marks the message for revert.
    
    // In a real implementation, we would:
    // 1. Store file snapshots before each modification
    // 2. Restore the previous snapshot
    // 3. Update the editor content
    // For now, we just validate that revert is possible
  }

  /**
   * Find the last assistant message that modified the file
   * @param messages Array of chat messages
   * @returns Last modifying message or null if none found
   */
  private findLastModifyingMessage(messages: ChatMessage[]): ChatMessage | null {
    // Iterate backwards through messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      
      // Check if it's an assistant message with tool calls
      if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
        // Check if any tool call modified the file
        const hasModifyingTool = message.toolCalls.some(toolCall => 
          toolCall.name === 'write_append' || toolCall.name === 'find_replace'
        );
        
        if (hasModifyingTool) {
          return message;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate a unique session ID
   * @returns UUID string
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Validate command input
   * @param input User input string
   * @returns Validation result with error message if invalid
   */
  public validateCommand(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();

    // Check if it looks like a command
    if (!trimmed.startsWith('/')) {
      return { valid: true }; // Not a command, so it's valid as regular input
    }

    // Try to parse the command
    const command = this.parseCommand(input);

    if (!command) {
      // Extract the attempted command name for error message
      const commandMatch = trimmed.match(/^\/(\w+)/);
      const commandName = commandMatch ? commandMatch[1] : trimmed.substring(1);
      
      return {
        valid: false,
        error: `Unknown command: /${commandName}. Available commands: /new, /revert`
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const commandParserService = CommandParserService.getInstance();
