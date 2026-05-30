'use client'

import {
  MessageCircle,
  Menu,
  Plus,
  PanelRightOpen,
  Minus,
  Send,
  MousePointer2,
} from 'lucide-react'
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
import { AttachmentChip } from './attachment-chip'
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

  if (mode === 'minimized') {
    return (
      <button
        data-testid="agent-chat-minimized-button"
        onClick={handleOpenFloating}
        className={cn(
          'fixed right-6 bottom-6 z-40',
          'flex items-center gap-2 rounded-full',
          'bg-primary px-4 py-2.5 text-sm font-medium text-white',
          'shadow-lg hover:bg-primary-active transition-colors',
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
        'fixed z-40 flex flex-col overflow-hidden border border-border bg-base shadow-2xl',
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
      {/* Title bar */}
      <div
        data-testid="agent-chat-drag-handle"
        {...(!isDocked ? dragHandleProps : {})}
        className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5"
      >
        <button
          data-testid="agent-chat-menu-button"
          onClick={toggleHistory}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface transition-colors"
          type="button"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          data-testid="agent-chat-new-conversation-button"
          onClick={startNewConversation}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface transition-colors"
          type="button"
        >
          <Plus className="h-4 w-4" />
        </button>

        <span className="flex-1 truncate text-center text-sm font-medium">
          {currentSession.title || t('agentChat.newConversation')}
        </span>

        {isDocked ? (
          <button
            data-testid="agent-chat-restore-button"
            onClick={handleRestoreFloating}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface transition-colors"
            type="button"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        ) : (
          <button
            data-testid="agent-chat-dock-button"
            onClick={handleDock}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface transition-colors"
            type="button"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}

        <button
          data-testid="agent-chat-minimize-button"
          onClick={handleMinimize}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface transition-colors"
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Body area with optional history drawer */}
      <div className="relative flex-1 overflow-hidden">
        {/* History drawer overlay */}
        <div
          data-testid="agent-chat-history-overlay"
          onClick={closeHistory}
          className={cn(
            'absolute inset-0 z-10 bg-black/20 transition-opacity duration-300',
            isHistoryOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />

        {/* History drawer - session list only */}
        <div
          data-testid="agent-chat-history-drawer"
          className={cn(
            'absolute inset-y-0 left-0 z-20 w-64 border-r border-border bg-base shadow-lg transition-transform duration-300',
            isHistoryOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="overflow-y-auto p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                data-testid={`agent-chat-session-item-${session.id}`}
                onClick={() => selectSession(session.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
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

        {/* Chat content */}
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {currentSession.messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">
                  {t('agentChat.startConversation')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentSession.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'ml-auto bg-primary text-white'
                        : 'bg-surface text-text-primary',
                    )}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-border p-3">
            {attachments.length > 0 && (
              <div
                data-testid="agent-chat-attachment-list"
                className="mb-2 flex flex-wrap gap-2"
              >
                {attachments.map((attachment) => (
                  <AttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={(id) =>
                      setAttachments((previous) =>
                        previous.filter((item) => item.id !== id),
                      )
                    }
                  />
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                data-testid="selection-tool-button"
                onClick={startSelection}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-base transition-colors"
                type="button"
                aria-label={t('agentChat.selectionTool')}
              >
                <MousePointer2 className="h-4 w-4" />
              </button>
              <textarea
                data-testid="agent-chat-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('agentChat.inputPlaceholder')}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                data-testid="agent-chat-send-button"
                onClick={handleSend}
                disabled={!draft.trim() && attachments.length === 0}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-active disabled:opacity-40 disabled:hover:bg-primary transition-colors"
                type="button"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
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
