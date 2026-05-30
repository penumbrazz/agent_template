import type { SelectionBoundingBox, SelectionPoint } from './types'

export function calculateBoundingBox(
  path: SelectionPoint[],
): SelectionBoundingBox {
  const xs = path.map((point) => point.x)
  const ys = path.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function isPointInPolygon(
  point: SelectionPoint,
  polygon: SelectionPoint[],
): boolean {
  let inside = false
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    const crossesY =
      currentPoint.y > point.y !== previousPoint.y > point.y
    const xOnSegment =
      ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) +
      currentPoint.x

    if (crossesY && point.x < xOnSegment) {
      inside = !inside
    }
  }
  return inside
}

export function distanceToPath(
  point: SelectionPoint,
  path: SelectionPoint[],
): number {
  if (path.length < 2) {
    return Number.POSITIVE_INFINITY
  }

  return Math.min(
    ...path
      .slice(1)
      .map((nextPoint, index) =>
        distanceToSegment(point, path[index], nextPoint),
      ),
  )
}

function distanceToSegment(
  point: SelectionPoint,
  start: SelectionPoint,
  end: SelectionPoint,
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  )
  const projected = { x: start.x + t * dx, y: start.y + t * dy }
  return Math.hypot(point.x - projected.x, point.y - projected.y)
}
