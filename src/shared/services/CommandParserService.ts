/**
 * Command Parser Service
 * Parses and executes chat commands like /new
 */

import type { ICommandParserService, Command, ChatContext } from '../types/services';

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
        error: `Unknown command: /${commandName}. Available commands: /new`
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const commandParserService = CommandParserService.getInstance();
