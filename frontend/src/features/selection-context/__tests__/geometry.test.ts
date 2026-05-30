import {
  calculateBoundingBox,
  distanceToPath,
  isPointInPolygon,
} from '../geometry'

describe('selection geometry', () => {
  it('calculates bounding box for a path', () => {
    expect(
      calculateBoundingBox([
        { x: 10, y: 20 },
        { x: 30, y: 5 },
        { x: 25, y: 45 },
      ]),
    ).toEqual({ x: 10, y: 5, width: 20, height: 40 })
  })

  it('detects points inside a polygon', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ]

    expect(isPointInPolygon({ x: 10, y: 10 }, square)).toBe(true)
    expect(isPointInPolygon({ x: 30, y: 10 }, square)).toBe(false)
  })

  it('computes distance from point to path', () => {
    expect(
      Math.round(
        distanceToPath(
          { x: 5, y: 5 },
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        ),
      ),
    ).toBe(5)
  })
})
