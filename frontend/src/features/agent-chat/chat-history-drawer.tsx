'use client'

import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

import type { AgentChatSession } from './types'

interface ChatHistoryDrawerProps {
  sessions: AgentChatSession[]
  currentSessionId: string
  isHistoryOpen: boolean
  onSelectSession: (sessionId: string) => void
  onCloseHistory: () => void
}

export function ChatHistoryDrawer({
  sessions,
  currentSessionId,
  isHistoryOpen,
  onSelectSession,
  onCloseHistory,
}: ChatHistoryDrawerProps) {
  const t = useT()

  return (
    <>
      {/* History drawer overlay */}
      <div
        data-testid="agent-chat-history-overlay"
        onClick={onCloseHistory}
        className={cn(
          'absolute inset-0 z-10 bg-black/20 transition-opacity duration-300',
          isHistoryOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* History drawer - session list only */}
      <div
        data-testid="agent-chat-history-drawer"
        className={cn(
          'absolute inset-y-0 left-0 z-20 w-64 border-r border-border bg-base shadow-[0_1px_3px_rgba(20,20,19,0.08)] transition-transform duration-300',
          isHistoryOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="overflow-y-auto p-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              data-testid={`agent-chat-session-item-${session.id}`}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                session.id === currentSessionId
                  ? 'bg-surface font-medium'
                  : 'hover:bg-surface',
              )}
              type="button"
            >
              <div className="truncate">
                {session.title || t('agentChat.newConversation')}
              </div>
              <div className="text-xs text-text-muted">
                {session.updatedLabel}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
