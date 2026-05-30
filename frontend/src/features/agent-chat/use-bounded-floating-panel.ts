'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { FloatingPanelPosition } from './types'

export const FLOATING_WIDTH = 420
export const FLOATING_HEIGHT = 560
export const FLOATING_MARGIN = 24

function getDefaultPosition(): FloatingPanelPosition {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 }
  }

  return {
    x: window.innerWidth - FLOATING_WIDTH - FLOATING_MARGIN,
    y: window.innerHeight - FLOATING_HEIGHT - FLOATING_MARGIN,
  }
}

function clampPosition(position: FloatingPanelPosition): FloatingPanelPosition {
  const maxX = Math.max(
    FLOATING_MARGIN,
    window.innerWidth - FLOATING_WIDTH - FLOATING_MARGIN,
  )
  const maxY = Math.max(
    FLOATING_MARGIN,
    window.innerHeight - FLOATING_HEIGHT - FLOATING_MARGIN,
  )

  return {
    x: Math.max(FLOATING_MARGIN, Math.min(position.x, maxX)),
    y: Math.max(FLOATING_MARGIN, Math.min(position.y, maxY)),
  }
}

export function useBoundedFloatingPanel() {
  const [position, setPosition] =
    useState<FloatingPanelPosition>(getDefaultPosition)
  const dragStart = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const resetPosition = useCallback(() => {
    setPosition(getDefaultPosition())
  }, [])

  useEffect(() => {
    function handleResize() {
      setPosition((previous) => clampPosition(previous))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const dragHandleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
      dragStart.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
      }
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragStart.current) return

      const dx = event.clientX - dragStart.current.startX
      const dy = event.clientY - dragStart.current.startY
      setPosition(
        clampPosition({
          x: dragStart.current.originX + dx,
          y: dragStart.current.originY + dy,
        }),
      )
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
      dragStart.current = null
    },
  }

  return { position, resetPosition, dragHandleProps }
}
