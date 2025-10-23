/**
 * Chat Session Manager
 * Manages chat sessions and message history independently from UI state
 * Handles the complete tool calling workflow with proper message sequencing
 */

import type { ChatSession, ChatMessage, ProviderProfile, ToolCall, ToolDefinition } from '../types/models';
import type { ExecutionContext, SimplifiedExecutionContext } from '../types/services';
import { llmService } from './LLMService';
import { toolExecutionService } from './ToolExecutionService';
import { documentService } from './DocumentService';

export type ChatSessionEvent = 
  | { type: 'message_added'; message: ChatMessage }
  | { type: 'message_updated'; messageId: string; updates: Partial<ChatMessage> }
  | { type: 'streaming_chunk'; messageId: string; chunk: string }
  | { type: 'session_updated'; session: ChatSession }
  | { type: 'error'; error: string };

export type ChatSessionListener = (event: ChatSessionEvent) => void;

export class ChatSessionManager {
  private static instance: ChatSessionManager;
  private sessions: Map<string, ChatSession> = new Map();
  private listeners: Set<ChatSessionListener> = new Set();

  private constructor() {}

  public static getInstance(): ChatSessionManager {
    if (!ChatSessionManager.instance) {
      ChatSessionManager.instance = new ChatSessionManager();
    }
    return ChatSessionManager.instance;
  }

  /**
   * Subscribe to session events
   */
  public subscribe(listener: ChatSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: ChatSessionEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Create a new chat session
   */
  public createSession(selectedModel: string, toolsEnabled: boolean = true): ChatSession {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      messages: [],
      selectedModel,
      toolsEnabled,
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.emit({ type: 'session_updated', session });
    
    return session;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all messages for a session
   */
  public getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * Add a message to the session
   */
  private addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messages.push(message);
    this.emit({ type: 'message_added', message });
    this.emit({ type: 'session_updated', session });
  }

  /**
   * Update a message in the session
   */
  private updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    session.messages[messageIndex] = {
      ...session.messages[messageIndex],
      ...updates,
    };

    this.emit({ type: 'message_updated', messageId, updates });
    this.emit({ type: 'session_updated', session });
  }

  /**
   * Send a user message and handle the complete conversation flow
   */
  public async sendMessage(
    sessionId: string,
    content: string,
    provider: ProviderProfile,
    modelName: string,
    executionContext: ExecutionContext
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.emit({ type: 'error', error: 'Session not found' });
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.addMessage(sessionId, userMessage);

    // Get tools if enabled (use simplified tools by default)
    const tools = session.toolsEnabled 
      ? toolExecutionService.getAvailableTools(true) 
      : undefined;

    // Process assistant response
    await this.processAssistantResponse(
      sessionId,
      provider,
      modelName,
      tools,
      executionContext
    );
  }

  /**
   * Process assistant response with tool calling support
   */
  private async processAssistantResponse(
    sessionId: string,
    provider: ProviderProfile,
    modelName: string,
    tools: ToolDefinition[] | undefined,
    executionContext: ExecutionContext
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    this.addMessage(sessionId, assistantMessage);

    try {
      // Send to LLM with streaming
      const response = await llmService.sendMessage(
        provider,
        modelName,
        session.messages,
        tools,
        (chunk: string) => {
          // Update message content with streaming chunk
          const msg = session.messages.find(m => m.id === assistantMessageId);
          if (msg) {
            msg.content += chunk;
            this.emit({ type: 'streaming_chunk', messageId: assistantMessageId, chunk });
          }
        }
      );

      // Update final message
      this.updateMessage(sessionId, assistantMessageId, {
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // Handle tool calls if present
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.handleToolCalls(
          sessionId,
          assistantMessageId,
          response.toolCalls,
          provider,
          modelName,
          tools,
          executionContext
        );
      }
    } catch (error) {
      console.error('Failed to process assistant response:', error);
      
      // Remove incomplete message
      const session = this.sessions.get(sessionId);
      if (session) {
        session.messages = session.messages.filter(m => m.id !== assistantMessageId);
        this.emit({ type: 'session_updated', session });
      }

      this.emit({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Failed to process response'
      });
    }
  }

  /**
   * Handle tool calls and continue conversation
   */
  private async handleToolCalls(
    sessionId: string,
    messageId: string,
    toolCalls: ToolCall[],
    provider: ProviderProfile,
    modelName: string,
    tools: ToolDefinition[] | undefined,
    executionContext: ExecutionContext
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updatedToolCalls: ToolCall[] = [];

    // Create simplified execution context for new tools
    const simplifiedContext: SimplifiedExecutionContext = {
      documentService: documentService,
      workspace: executionContext.workspace
    };

    // Execute all tool calls
    for (const toolCall of toolCalls) {
      try {
        // Try simplified tools first, fall back to legacy tools
        let result;
        const isSimplifiedTool = ['read', 'write', 'read_workspace_file', 'grep', 'replace', 'ls'].includes(toolCall.name);
        
        if (isSimplifiedTool) {
          result = await toolExecutionService.executeSimplifiedTool(
            toolCall.name,
            toolCall.arguments,
            simplifiedContext
          );
        } else {
          result = await toolExecutionService.executeTool(
            toolCall.name,
            toolCall.arguments,
            executionContext
          );
        }

        updatedToolCalls.push({
          ...toolCall,
          result,
        });
      } catch (error) {
        console.error(`Tool execution failed for ${toolCall.name}:`, error);
        
        updatedToolCalls.push({
          ...toolCall,
          result: {
            error: error instanceof Error ? error.message : 'Tool execution failed',
          },
        });
      }
    }

    // Update message with tool results
    this.updateMessage(sessionId, messageId, {
      toolCalls: updatedToolCalls,
    });

    // Continue conversation with tool results
    await this.processAssistantResponse(
      sessionId,
      provider,
      modelName,
      tools,
      executionContext
    );
  }

  /**
   * Update session settings
   */
  public updateSession(sessionId: string, updates: Partial<Pick<ChatSession, 'selectedModel' | 'toolsEnabled'>>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates);
    this.emit({ type: 'session_updated', session });
  }

  /**
   * Clear session messages
   */
  public clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messages = [];
    this.emit({ type: 'session_updated', session });
  }

  /**
   * Delete session
   */
  public deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const chatSessionManager = ChatSessionManager.getInstance();
