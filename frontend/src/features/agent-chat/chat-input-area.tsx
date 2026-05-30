'use client'

import { MousePointer2, Send } from 'lucide-react'

import { useT } from '@/i18n'
import type { ChatAttachment } from '@/features/selection-context/types'

import { AttachmentChip } from './attachment-chip'

interface ChatInputAreaProps {
  draft: string
  attachments: ChatAttachment[]
  onDraftChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onStartSelection: () => void
  onRemoveAttachment: (id: string) => void
}

export function ChatInputArea({
  draft,
  attachments,
  onDraftChange,
  onKeyDown,
  onSend,
  onStartSelection,
  onRemoveAttachment,
}: ChatInputAreaProps) {
  const t = useT()

  return (
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
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          data-testid="selection-tool-button"
          onClick={onStartSelection}
          className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-primary hover:bg-base transition-colors"
          type="button"
          aria-label={t('agentChat.selectionTool')}
        >
          <MousePointer2 className="h-4 w-4" />
        </button>
        <textarea
          data-testid="agent-chat-input"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('agentChat.inputPlaceholder')}
          rows={1}
          className="flex-1 resize-none rounded-md border border-border bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          data-testid="agent-chat-send-button"
          onClick={onSend}
          disabled={!draft.trim() && attachments.length === 0}
          className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-active disabled:opacity-40 disabled:hover:bg-primary transition-colors"
          type="button"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
