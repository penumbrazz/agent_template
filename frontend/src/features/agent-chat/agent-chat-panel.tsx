'use client'

import { MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { getRuntimeConfigSync } from '@/lib/runtime-config'
import { createExtractorRegistry } from '@/features/selection-context/extractors/registry'
import { extractDomSelection } from '@/features/selection-context/extractors/dom-extractor'
import { extractTableSelection } from '@/features/selection-context/extractors/table-extractor'
import { extractEchartsSelection } from '@/features/selection-context/extractors/echarts-extractor'
import { SelectionOverlay } from '@/features/selection-context/selection-overlay'
import { useSelectionOverlay } from '@/features/selection-context/use-selection-overlay'
import type { ChatAttachment } from '@/features/selection-context/types'

import {
  FLOATING_HEIGHT,
  FLOATING_WIDTH,
  useBoundedFloatingPanel,
} from './use-bounded-floating-panel'
import { useDockedPanelWidth } from './use-docked-panel-width'
import { useAgentChatState } from './use-agent-chat-state'
import { ChatTitleBar } from './chat-title-bar'
import { ChatHistoryDrawer } from './chat-history-drawer'
import { ChatMessageList } from './chat-message-list'
import { ChatInputArea } from './chat-input-area'
import type { AgentChatMode } from './types'

export function AgentChatPanel() {
  const [mode, setMode] = useState<AgentChatMode>('minimized')
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const t = useT()

  const extractorRegistry = useMemo(
    () =>
      createExtractorRegistry([
        {
          kind: 'dom',
          extract: extractDomSelection,
        },
        {
          kind: 'table',
          extract: extractTableSelection,
        },
        {
          kind: 'chart',
          extract: extractEchartsSelection,
        },
      ]),
    [],
  )

  const {
    sessions,
    currentSession,
    currentSessionId,
    isHistoryOpen,
    openHistory,
    closeHistory,
    selectSession,
    startNewConversation,
    sendMessage,
  } = useAgentChatState()

  const { position, resetPosition, dragHandleProps } = useBoundedFloatingPanel()
  const { width: dockedWidth, resizeHandleProps } = useDockedPanelWidth()

  const { isSelecting, path, startSelection, overlayProps } =
    useSelectionOverlay(async (geometry) => {
      const artifacts = await extractorRegistry.extract(
        geometry,
        getRuntimeConfigSync().selectionContextPolicy,
      )
      setAttachments((previous) => [
        ...previous,
        ...artifacts.map((artifact) => ({
          id: artifact.id,
          label: artifact.label,
          artifact,
        })),
      ])
    })

  function handleMinimize() {
    closeHistory()
    setMode('minimized')
  }

  function handleOpenFloating() {
    resetPosition()
    setMode('floating')
  }

  function handleDock() {
    setMode('docked')
  }

  function handleRestoreFloating() {
    resetPosition()
    setMode('floating')
  }

  function handleSend() {
    if (!draft.trim() && attachments.length === 0) return
    sendMessage({ content: draft, attachments })
    setDraft('')
    setAttachments([])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function toggleHistory() {
    if (isHistoryOpen) {
      closeHistory()
    } else {
      openHistory()
    }
  }

  function removeAttachment(id: string) {
    setAttachments((previous) => previous.filter((item) => item.id !== id))
  }

  if (mode === 'minimized') {
    return (
      <button
        data-testid="agent-chat-minimized-button"
        onClick={handleOpenFloating}
        className={cn(
          'fixed right-6 bottom-6 z-40',
          'flex items-center gap-2 rounded-full',
          'bg-primary px-4 min-h-[44px] text-sm font-medium text-white',
          'shadow-[0_1px_3px_rgba(20,20,19,0.08)] hover:bg-primary-active transition-colors',
        )}
      >
        <MessageCircle className="h-4 w-4" />
        {t('agentChat.agent')}
      </button>
    )
  }

  const isDocked = mode === 'docked'

  return (
    <div
      data-testid="agent-chat-panel"
      data-selection-ignore="true"
      className={cn(
        'fixed z-40 flex flex-col overflow-hidden border border-border bg-base shadow-[0_4px_12px_rgba(20,20,19,0.12)]',
        isDocked ? 'top-12 bottom-0 right-0 rounded-none' : 'rounded-xl',
      )}
      style={
        isDocked
          ? { width: dockedWidth }
          : {
              width: FLOATING_WIDTH,
              height: FLOATING_HEIGHT,
              left: position.x,
              top: position.y,
            }
      }
    >
      <ChatTitleBar
        sessionTitle={currentSession.title}
        isDocked={isDocked}
        dragHandleProps={dragHandleProps}
        onToggleHistory={toggleHistory}
        onNewConversation={startNewConversation}
        onDock={handleDock}
        onRestoreFloating={handleRestoreFloating}
        onMinimize={handleMinimize}
      />

      {/* Body area with optional history drawer */}
      <div className="relative flex-1 overflow-hidden">
        <ChatHistoryDrawer
          sessions={sessions}
          currentSessionId={currentSessionId}
          isHistoryOpen={isHistoryOpen}
          onSelectSession={selectSession}
          onCloseHistory={closeHistory}
        />

        {/* Chat content */}
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ChatMessageList messages={currentSession.messages} />
          </div>

          <ChatInputArea
            draft={draft}
            attachments={attachments}
            onDraftChange={setDraft}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            onStartSelection={startSelection}
            onRemoveAttachment={removeAttachment}
          />
        </div>
      </div>

      {/* Resize handle for docked mode */}
      {isDocked && (
        <div
          data-testid="agent-chat-resize-handle"
          {...resizeHandleProps}
          className="absolute inset-y-0 left-0 w-1.5 cursor-col-resize hover:bg-primary/20 transition-colors"
        />
      )}
      {isSelecting && (
        <SelectionOverlay path={path} overlayProps={overlayProps} />
      )}
    </div>
  )
}
