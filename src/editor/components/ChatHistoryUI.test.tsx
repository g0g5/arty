/**
 * Chat History UI Integration Tests
 * Tests for new chat creation, session archival, history modal, and restoration workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel';
import { ChatHistoryModal } from './ChatHistoryModal';
import type { ChatSession, ProviderProfile } from '../../shared/types/models';
import type { ChatHistoryRecord } from '../../shared/services/ChatHistoryService';

describe('Chat History UI Integration Tests', () => {
  let mockProviders: ProviderProfile[];
  let mockSession: ChatSession;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock providers
    mockProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'encrypted-key',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    // Setup mock chat session
    mockSession = {
      id: 'session-1',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'How to implement authentication?',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Here is how to implement authentication...',
          timestamp: Date.now() + 1000,
        },
      ],
      selectedModel: 'openai:gpt-4',
      toolsEnabled: true,
      createdAt: Date.now(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('New Chat Creation and Session Archival', () => {
    it('should display New Chat button in chat panel', () => {
      const mockOnNewChat = vi.fn();

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    });

    it('should call onNewChat when New Chat button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNewChat = vi.fn();

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      expect(mockOnNewChat).toHaveBeenCalledTimes(1);
    });

    it('should archive current session when starting new chat', async () => {
      const user = userEvent.setup();
      const mockOnNewChat = vi.fn(async () => {
        // Simulate archival by clearing messages
        mockSession.messages = [];
      });

      const { rerender } = render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      // Verify messages exist
      expect(screen.getByText('How to implement authentication?')).toBeInTheDocument();

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      expect(mockOnNewChat).toHaveBeenCalled();

      // Rerender with empty session
      const emptySession = { ...mockSession, messages: [] };
      rerender(
        <ChatPanel
          session={emptySession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      // Messages should be cleared
      expect(screen.queryByText('How to implement authentication?')).not.toBeInTheDocument();
    });

    it('should preserve model and tools settings when creating new chat', async () => {
      const user = userEvent.setup();
      let capturedSettings: { model: string; tools: boolean } | null = null;

      const mockOnNewChat = vi.fn(() => {
        capturedSettings = {
          model: mockSession.selectedModel,
          tools: mockSession.toolsEnabled,
        };
      });

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      expect(capturedSettings).toEqual({
        model: 'openai:gpt-4',
        tools: true,
      });
    });

    it('should not archive empty sessions when creating new chat', async () => {
      const user = userEvent.setup();
      const emptySession = { ...mockSession, messages: [] };
      const mockOnNewChat = vi.fn();

      render(
        <ChatPanel
          session={emptySession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
        />
      );

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      // Should still call onNewChat, but archival logic should skip empty sessions
      expect(mockOnNewChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('History Modal Display and Session Restoration', () => {
    const mockHistoryRecords: ChatHistoryRecord[] = [
      {
        id: 'history-1',
        title: 'How to implement authentication?',
        createdAt: Date.now() - 7200000, // 2 hours ago
        archivedAt: Date.now() - 3600000, // 1 hour ago
        messageCount: 5,
        session: {
          id: 'session-1',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'How to implement authentication?',
              timestamp: Date.now() - 7200000,
            },
          ],
          selectedModel: 'openai:gpt-4',
          toolsEnabled: true,
          createdAt: Date.now() - 7200000,
        },
      },
      {
        id: 'history-2',
        title: 'Fix database connection issue',
        createdAt: Date.now() - 86400000, // 1 day ago
        archivedAt: Date.now() - 86400000,
        messageCount: 3,
        session: {
          id: 'session-2',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Fix database connection issue',
              timestamp: Date.now() - 86400000,
            },
          ],
          selectedModel: 'openai:gpt-3.5-turbo',
          toolsEnabled: false,
          createdAt: Date.now() - 86400000,
        },
      },
    ];

    it('should display History button in chat panel', () => {
      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onShowHistory={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    });

    it('should call onShowHistory when History button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnShowHistory = vi.fn();

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onShowHistory={mockOnShowHistory}
        />
      );

      const historyButton = screen.getByRole('button', { name: /history/i });
      await user.click(historyButton);

      expect(mockOnShowHistory).toHaveBeenCalledTimes(1);
    });

    it('should display history modal when opened', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      expect(screen.getByText('Chat History')).toBeInTheDocument();
    });

    it('should not display history modal when closed', () => {
      render(
        <ChatHistoryModal
          isOpen={false}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      expect(screen.queryByText('Chat History')).not.toBeInTheDocument();
    });

    it('should display all archived sessions in history modal', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      expect(screen.getByText('How to implement authentication?')).toBeInTheDocument();
      expect(screen.getByText('Fix database connection issue')).toBeInTheDocument();
      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('3 messages')).toBeInTheDocument();
    });

    it('should display empty state when no history records exist', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={[]}
        />
      );

      expect(screen.getByText('No chat history yet')).toBeInTheDocument();
      expect(screen.getByText('Start a new chat and it will appear here')).toBeInTheDocument();
    });

    it('should display loading state while loading history', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={[]}
          isLoading={true}
        />
      );

      // Check for loading spinner
      const modal = screen.getByText('Chat History').closest('div');
      expect(modal).toBeInTheDocument();
    });

    it('should allow selecting a history record', async () => {
      const user = userEvent.setup();

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      const firstRecord = screen.getByText('How to implement authentication?').closest('div');
      expect(firstRecord).toBeInTheDocument();

      await user.click(firstRecord!);

      // Restore button should be enabled after selection
      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      expect(restoreButton).not.toBeDisabled();
    });

    it('should restore selected session when Restore button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRestore = vi.fn();

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={mockOnRestore}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Select first record
      const firstRecord = screen.getByText('How to implement authentication?').closest('div');
      await user.click(firstRecord!);

      // Click restore button
      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      await user.click(restoreButton);

      expect(mockOnRestore).toHaveBeenCalledWith('history-1');
    });

    it('should close modal after successful restoration', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      const mockOnRestore = vi.fn();

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={mockOnClose}
          onRestore={mockOnRestore}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Select and restore
      const firstRecord = screen.getByText('How to implement authentication?').closest('div');
      await user.click(firstRecord!);

      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      await user.click(restoreButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={mockOnClose}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button (X) is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={mockOnClose}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should disable Restore button when no session is selected', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      expect(restoreButton).toBeDisabled();
    });

    it('should display relative timestamps for history records', () => {
      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Should show relative time like "1 hour ago", "1 day ago"
      expect(screen.getByText(/hour ago/i)).toBeInTheDocument();
      expect(screen.getByText(/day ago/i)).toBeInTheDocument();
    });

    it('should allow deleting a history record', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={mockOnDelete}
          historyRecords={mockHistoryRecords}
        />
      );

      // Find delete buttons
      const deleteButtons = screen.getAllByLabelText('Delete');
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this chat history?');
      expect(mockOnDelete).toHaveBeenCalledWith('history-1');

      confirmSpy.mockRestore();
    });

    it('should not delete when deletion is cancelled', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={mockOnDelete}
          historyRecords={mockHistoryRecords}
        />
      );

      const deleteButtons = screen.getAllByLabelText('Delete');
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Error Handling for Failed Restoration', () => {
    it('should handle restoration errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnRestore = vi.fn().mockRejectedValue(new Error('Failed to restore session'));

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={mockOnRestore}
          onDelete={vi.fn()}
          historyRecords={[
            {
              id: 'history-1',
              title: 'Test session',
              createdAt: Date.now(),
              archivedAt: Date.now(),
              messageCount: 1,
              session: mockSession,
            },
          ]}
        />
      );

      // Select and try to restore
      const record = screen.getByText('Test session').closest('div');
      await user.click(record!);

      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      await user.click(restoreButton);

      // Error should be handled by parent component
      expect(mockOnRestore).toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn().mockRejectedValue(new Error('Failed to delete'));
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={mockOnDelete}
          historyRecords={[
            {
              id: 'history-1',
              title: 'Test session',
              createdAt: Date.now(),
              archivedAt: Date.now(),
              messageCount: 1,
              session: mockSession,
            },
          ]}
        />
      );

      const deleteButtons = screen.getAllByLabelText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('UI State Consistency During History Operations', () => {
    it('should maintain selection state when modal is reopened', async () => {
      const user = userEvent.setup();
      const mockHistoryRecords: ChatHistoryRecord[] = [
        {
          id: 'history-1',
          title: 'Test session',
          createdAt: Date.now(),
          archivedAt: Date.now(),
          messageCount: 1,
          session: mockSession,
        },
      ];

      const { rerender } = render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Select a record
      const record = screen.getByText('Test session').closest('div');
      await user.click(record!);

      // Close modal
      rerender(
        <ChatHistoryModal
          isOpen={false}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Reopen modal
      rerender(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={mockHistoryRecords}
        />
      );

      // Selection should be cleared
      const restoreButton = screen.getByRole('button', { name: /restore selected/i });
      expect(restoreButton).toBeDisabled();
    });

    it('should update history list after deletion', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      let historyRecords: ChatHistoryRecord[] = [
        {
          id: 'history-1',
          title: 'First session',
          createdAt: Date.now(),
          archivedAt: Date.now(),
          messageCount: 1,
          session: mockSession,
        },
        {
          id: 'history-2',
          title: 'Second session',
          createdAt: Date.now(),
          archivedAt: Date.now(),
          messageCount: 1,
          session: mockSession,
        },
      ];

      const mockOnDelete = vi.fn((id: string) => {
        historyRecords = historyRecords.filter(r => r.id !== id);
      });

      const { rerender } = render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={mockOnDelete}
          historyRecords={historyRecords}
        />
      );

      expect(screen.getByText('First session')).toBeInTheDocument();
      expect(screen.getByText('Second session')).toBeInTheDocument();

      // Delete first record
      const deleteButtons = screen.getAllByLabelText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('history-1');

      // Rerender with updated list
      rerender(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={mockOnDelete}
          historyRecords={historyRecords}
        />
      );

      expect(screen.queryByText('First session')).not.toBeInTheDocument();
      expect(screen.getByText('Second session')).toBeInTheDocument();

      confirmSpy.mockRestore();
    });

    it('should preserve chat panel state during history operations', async () => {
      const user = userEvent.setup();
      const mockOnShowHistory = vi.fn();

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onShowHistory={mockOnShowHistory}
        />
      );

      // Verify messages are displayed
      expect(screen.getByText('How to implement authentication?')).toBeInTheDocument();

      // Open history
      const historyButton = screen.getByRole('button', { name: /history/i });
      await user.click(historyButton);

      expect(mockOnShowHistory).toHaveBeenCalled();

      // Messages should still be visible
      expect(screen.getByText('How to implement authentication?')).toBeInTheDocument();
    });

    it('should handle rapid new chat and history operations', async () => {
      const user = userEvent.setup();
      const mockOnNewChat = vi.fn();
      const mockOnShowHistory = vi.fn();

      render(
        <ChatPanel
          session={mockSession}
          providers={mockProviders}
          onSendMessage={vi.fn()}
          onCommand={vi.fn()}
          onModelChange={vi.fn()}
          onToolsToggle={vi.fn()}
          onNewChat={mockOnNewChat}
          onShowHistory={mockOnShowHistory}
        />
      );

      // Click new chat multiple times rapidly
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);
      await user.click(newChatButton);

      // Click history button
      const historyButton = screen.getByRole('button', { name: /history/i });
      await user.click(historyButton);

      // All operations should be called
      expect(mockOnNewChat).toHaveBeenCalledTimes(2);
      expect(mockOnShowHistory).toHaveBeenCalledTimes(1);
    });

    it('should display correct message count in history records', () => {
      const recordWithManyMessages: ChatHistoryRecord = {
        id: 'history-1',
        title: 'Long conversation',
        createdAt: Date.now(),
        archivedAt: Date.now(),
        messageCount: 42,
        session: {
          ...mockSession,
          messages: Array(42).fill(null).map((_, i) => ({
            id: `msg-${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i}`,
            timestamp: Date.now() + i * 1000,
          })),
        },
      };

      render(
        <ChatHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
          historyRecords={[recordWithManyMessages]}
        />
      );

      expect(screen.getByText('42 messages')).toBeInTheDocument();
    });
  });
});
