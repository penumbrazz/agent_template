'use client'

import { useMemo, useState } from 'react'

import { useT } from '@/i18n'

import { MOCK_AGENT_SESSIONS, MOCK_ASSISTANT_REPLY } from './mock-data'
import type {
  AgentChatMessage,
  AgentChatSession,
  SendAgentChatMessagePayload,
} from './types'

const UNTITLED_SESSION_TITLE = ''

function createMessage(
  role: AgentChatMessage['role'],
  content: string,
): AgentChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  }
}

export function useAgentChatState() {
  const t = useT()
  const [sessions, setSessions] =
    useState<AgentChatSession[]>(MOCK_AGENT_SESSIONS)
  const [currentSessionId, setCurrentSessionId] = useState(
    MOCK_AGENT_SESSIONS[0].id,
  )
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const currentSession = useMemo(
    () =>
      sessions.find((session) => session.id === currentSessionId) ??
      sessions[0],
    [currentSessionId, sessions],
  )

  function selectSession(sessionId: string) {
    setCurrentSessionId(sessionId)
    setIsHistoryOpen(false)
  }

  function startNewConversation() {
    const session: AgentChatSession = {
      id: `session-${Date.now()}`,
      title: UNTITLED_SESSION_TITLE,
      updatedLabel: '',
      messages: [],
    }
    setSessions((previous) => [session, ...previous])
    setCurrentSessionId(session.id)
    setIsHistoryOpen(false)
  }

  function sendMessage(payload: SendAgentChatMessagePayload) {
    const trimmed = payload.content.trim()
    if (!trimmed && payload.attachments.length === 0) {
      return
    }

    const userMessage = createMessage(
      'user',
      trimmed || '引用页面上下文',
    )
    userMessage.attachments = payload.attachments
    const assistantMessage = createMessage('assistant', MOCK_ASSISTANT_REPLY)

    const titleSource =
      trimmed || payload.attachments[0]?.label || ''

    setSessions((previous) =>
      previous.map((session) => {
        if (session.id !== currentSessionId) {
          return session
        }

        const nextMessages = [
          ...session.messages,
          userMessage,
          assistantMessage,
        ]

        return {
          ...session,
          title: !session.title
            ? titleSource.slice(0, 16)
            : session.title,
          updatedLabel: t('agentChat.messageCountJustNow', {
            count: nextMessages.length,
          }),
          messages: nextMessages,
        }
      }),
    )
  }

  return {
    sessions,
    currentSession,
    currentSessionId,
    isHistoryOpen,
    openHistory: () => setIsHistoryOpen(true),
    closeHistory: () => setIsHistoryOpen(false),
    selectSession,
    startNewConversation,
    sendMessage,
  }
}
