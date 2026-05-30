'use client'

import { useEffect, useRef, useState } from 'react'

export const DOCKED_DEFAULT_WIDTH = 420
export const DOCKED_MIN_WIDTH = 360
export const DOCKED_MAX_WIDTH_RATIO = 0.5
export const DOCKED_WIDTH_STORAGE_KEY = 'agent-chat:docked-width'

function getMaxWidth(): number {
  return Math.max(
    DOCKED_MIN_WIDTH,
    Math.floor(window.innerWidth * DOCKED_MAX_WIDTH_RATIO),
  )
}

function clampWidth(width: number): number {
  return Math.max(DOCKED_MIN_WIDTH, Math.min(width, getMaxWidth()))
}

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DOCKED_DEFAULT_WIDTH

  const stored = window.localStorage.getItem(DOCKED_WIDTH_STORAGE_KEY)
  if (!stored) return DOCKED_DEFAULT_WIDTH

  const parsed = Number(stored)
  return Number.isNaN(parsed) ? DOCKED_DEFAULT_WIDTH : clampWidth(parsed)
}

export function useDockedPanelWidth() {
  const [width, setWidth] = useState(readStoredWidth)
  const dragStart = useRef<{ startX: number; originWidth: number } | null>(null)

  useEffect(() => {
    function handleResize() {
      setWidth((previous) => clampWidth(previous))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(DOCKED_WIDTH_STORAGE_KEY, String(width))
  }, [width])

  const resizeHandleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
      dragStart.current = { startX: event.clientX, originWidth: width }
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragStart.current) return

      const newWidth =
        dragStart.current.originWidth -
        (event.clientX - dragStart.current.startX)
      setWidth(clampWidth(newWidth))
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      ;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
      dragStart.current = null
    },
  }

  return { width, resizeHandleProps }
}
