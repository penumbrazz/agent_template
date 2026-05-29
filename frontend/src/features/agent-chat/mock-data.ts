import type { AgentChatSession } from './types'

export const MOCK_AGENT_SESSIONS: AgentChatSession[] = [
  {
    id: 'session-new',
    title: '新对话',
    updatedLabel: '0 条 · 8 小时前',
    messages: [],
  },
  {
    id: 'session-hello',
    title: '你好',
    updatedLabel: '1 条 · 23 小时前',
    messages: [
      {
        id: 'message-hello-assistant',
        role: 'assistant',
        content: '你好，我是你的 Agent 助手。这里先使用 Mock 数据展示对话效果。',
      },
    ],
  },
]

export const MOCK_ASSISTANT_REPLY = '收到。这是一条本地 Mock 回复，用于验证聊天面板交互。'
