'use client'

import { useT } from '@/i18n'

import type { SelectionPoint } from './types'

interface SelectionOverlayProps {
  path: SelectionPoint[]
  overlayProps: {
    onPointerDown: (event: React.PointerEvent) => void
    onPointerMove: (event: React.PointerEvent) => void
    onPointerUp: () => void
  }
}

export function SelectionOverlay({
  path,
  overlayProps,
}: SelectionOverlayProps) {
  const t = useT()
  const pathData = path
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div
      data-testid="selection-overlay"
      className="fixed inset-0 z-50 cursor-crosshair bg-black/5"
      {...overlayProps}
    >
      <div
        data-testid="selection-overlay-hint"
        className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-surface-dark px-4 py-2 text-sm text-white shadow-lg"
      >
        {t('agentChat.selectionHint')}
      </div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {path.length > 1 && (
          <path
            data-testid="selection-overlay-path"
            d={pathData}
            fill="none"
            stroke="rgb(var(--color-primary))"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        )}
      </svg>
    </div>
  )
}
