'use client'

import { BarChart3, FileText, ImageIcon, Table2, X } from 'lucide-react'

import { useT } from '@/i18n'

import type { ChatAttachment } from '@/features/selection-context/types'

interface AttachmentChipProps {
  attachment: ChatAttachment
  onRemove: (id: string) => void
}

const iconClass = 'h-3.5 w-3.5 shrink-0 text-primary'

function AttachmentIcon({
  kind,
}: {
  kind: ChatAttachment['artifact']['kind']
}) {
  if (kind === 'chart') return <BarChart3 className={iconClass} />
  if (kind === 'table') return <Table2 className={iconClass} />
  if (kind === 'screenshot') return <ImageIcon className={iconClass} />
  return <FileText className={iconClass} />
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const t = useT()
  return (
    <div
      data-testid="agent-chat-attachment-chip"
      className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-primary"
      data-attachment-kind={attachment.artifact.kind}
    >
      <AttachmentIcon kind={attachment.artifact.kind} />
      <span className="truncate">{attachment.label}</span>
      <button
        data-testid="agent-chat-attachment-remove"
        type="button"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-base"
        onClick={() => onRemove(attachment.id)}
        aria-label={t('common.delete')}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
