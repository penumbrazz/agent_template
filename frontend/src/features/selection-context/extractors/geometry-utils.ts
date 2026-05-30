import type { SelectionGeometry } from '../types'

/**
 * Check whether an element's bounding rectangle intersects
 * with the given selection geometry's bounding box.
 * Elements marked with data-selection-ignore="true" are excluded.
 */
export function intersectsSelection(
  element: HTMLElement,
  geometry: SelectionGeometry,
): boolean {
  if (element.closest('[data-selection-ignore="true"]')) {
    return false
  }

  const rect = element.getBoundingClientRect()
  const box = geometry.boundingBox
  return (
    rect.right >= box.x &&
    rect.left <= box.x + box.width &&
    rect.bottom >= box.y &&
    rect.top <= box.y + box.height
  )
}
