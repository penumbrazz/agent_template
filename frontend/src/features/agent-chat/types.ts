export type AgentChatMode = 'minimized' | 'floating' | 'docked'

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface AgentChatSession {
  id: string
  title: string
  updatedLabel: string
  messages: AgentChatMessage[]
}

export interface FloatingPanelPosition {
  x: number
  y: number
}
