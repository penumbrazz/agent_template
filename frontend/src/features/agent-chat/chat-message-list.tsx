'use client'

import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

import type { AgentChatMessage } from './types'

interface ChatMessageListProps {
  messages: AgentChatMessage[]
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const t = useT()

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">
          {t('agentChat.startConversation')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'max-w-[85%] rounded-md px-3 py-2 text-sm',
            message.role === 'user'
              ? 'ml-auto bg-primary text-on-primary'
              : 'bg-surface text-text-primary',
          )}
        >
          {message.content}
        </div>
      ))}
    </div>
  )
}
