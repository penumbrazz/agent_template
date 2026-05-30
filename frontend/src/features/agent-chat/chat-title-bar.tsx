'use client'

import { Menu, Minus, PanelRightOpen, Plus } from 'lucide-react'

import { useT } from '@/i18n'

interface ChatTitleBarProps {
  sessionTitle: string
  isDocked: boolean
  dragHandleProps: Record<string, unknown> | null
  onToggleHistory: () => void
  onNewConversation: () => void
  onDock: () => void
  onRestoreFloating: () => void
  onMinimize: () => void
}

export function ChatTitleBar({
  sessionTitle,
  isDocked,
  dragHandleProps,
  onToggleHistory,
  onNewConversation,
  onDock,
  onRestoreFloating,
  onMinimize,
}: ChatTitleBarProps) {
  const t = useT()

  return (
    <div
      data-testid="agent-chat-drag-handle"
      {...(!isDocked && dragHandleProps ? dragHandleProps : {})}
      className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5"
    >
      <button
        data-testid="agent-chat-menu-button"
        onClick={onToggleHistory}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface transition-colors"
        type="button"
      >
        <Menu className="h-4 w-4" />
      </button>

      <button
        data-testid="agent-chat-new-conversation-button"
        onClick={onNewConversation}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface transition-colors"
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>

      <span className="flex-1 truncate text-center text-sm font-medium">
        {sessionTitle || t('agentChat.newConversation')}
      </span>

      {isDocked ? (
        <button
          data-testid="agent-chat-restore-button"
          onClick={onRestoreFloating}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface transition-colors"
          type="button"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      ) : (
        <button
          data-testid="agent-chat-dock-button"
          onClick={onDock}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface transition-colors"
          type="button"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}

      <button
        data-testid="agent-chat-minimize-button"
        onClick={onMinimize}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface transition-colors"
        type="button"
      >
        <Minus className="h-4 w-4" />
      </button>
    </div>
  )
}
