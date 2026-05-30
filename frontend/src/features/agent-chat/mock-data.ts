import { translate } from '@/i18n'

import type { AgentChatSession } from './types'

export const MOCK_AGENT_SESSIONS: AgentChatSession[] = [
  {
    id: 'session-new',
    title: 'New conversation',
    updatedLabel: '0 messages · 8 hours ago',
    messages: [],
  },
  {
    id: 'session-hello',
    title: 'Hello',
    updatedLabel: '1 message · 23 hours ago',
    messages: [
      {
        id: 'message-hello-assistant',
        role: 'assistant',
        content: translate('agentChat.mockGreeting'),
      },
    ],
  },
]

export const MOCK_ASSISTANT_REPLY = translate('agentChat.mockReply')
