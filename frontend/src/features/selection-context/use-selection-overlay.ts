'use client'

import { useEffect, useState } from 'react'

import { calculateBoundingBox } from './geometry'
import type { SelectionGeometry, SelectionPoint } from './types'

const MIN_SELECTION_SIZE = 8

export function useSelectionOverlay(
  onComplete: (geometry: SelectionGeometry) => void,
) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [path, setPath] = useState<SelectionPoint[]>([])

  useEffect(() => {
    if (!isSelecting) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSelecting(false)
        setPath([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelecting])

  function startSelection() {
    setIsSelecting(true)
    setPath([])
  }

  function stopSelection() {
    setIsSelecting(false)
    setPath([])
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    setPath([{ x: event.clientX, y: event.clientY }])
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (path.length === 0) return
    setPath((previous) => [...previous, { x: event.clientX, y: event.clientY }])
  }

  function handlePointerUp() {
    if (path.length < 2) {
      stopSelection()
      return
    }

    const boundingBox = calculateBoundingBox(path)
    if (
      boundingBox.width < MIN_SELECTION_SIZE ||
      boundingBox.height < MIN_SELECTION_SIZE
    ) {
      stopSelection()
      return
    }

    onComplete({
      id: `selection-${Date.now()}`,
      path,
      boundingBox,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },
      createdAt: new Date().toISOString(),
    })
    stopSelection()
  }

  return {
    isSelecting,
    path,
    startSelection,
    stopSelection,
    overlayProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  }
}
