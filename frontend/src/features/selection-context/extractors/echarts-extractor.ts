import { distanceToPath, isPointInPolygon } from '../geometry'
import type { ChartSelectionArtifact, SelectionGeometry } from '../types'
import { getSelectableCharts } from './echarts-registry'

const PATH_DISTANCE_THRESHOLD = 8

export async function extractEchartsSelection(
  geometry: SelectionGeometry,
): Promise<ChartSelectionArtifact[]> {
  return getSelectableCharts()
    .filter((chart) => intersectsSelection(chart.element, geometry))
    .map((chart) => {
      const selectedPoints = chart
        .getPoints()
        .filter((point) => {
          const screenPoint = { x: point.screenX, y: point.screenY }
          return (
            isPointInPolygon(screenPoint, geometry.path) ||
            distanceToPath(screenPoint, geometry.path) <=
              PATH_DISTANCE_THRESHOLD
          )
        })

      if (selectedPoints.length === 0) {
        return null
      }

      const seriesMap = new Map<string, typeof selectedPoints>()
      for (const point of selectedPoints) {
        const series = seriesMap.get(point.seriesName) ?? []
        series.push(point)
        seriesMap.set(point.seriesName, series)
      }

      const selectedSeries = Array.from(seriesMap.entries()).map(
        ([name, points]) => ({
          name,
          points: points.map((point) => ({
            x: point.x,
            y: point.y,
            label: point.label,
            raw: point.raw,
          })),
        }),
      )

      const chartTestId = chart.element.dataset.testid
      return {
        id: `artifact-chart-${geometry.id}`,
        kind: 'chart' as const,
        label: `图表 · ${chart.title} · ${selectedPoints.length} 个点`,
        geometry,
        summary: `${chart.title}：选中 ${selectedPoints.length} 个点`,
        chartTitle: chart.title,
        chartTestId,
        selectedSeries,
        xRange: {
          min: selectedPoints[0].x,
          max: selectedPoints[selectedPoints.length - 1].x,
        },
      } satisfies ChartSelectionArtifact
    })
    .filter(
      (artifact): artifact is ChartSelectionArtifact => Boolean(artifact),
    )
}

function intersectsSelection(
  element: HTMLElement,
  geometry: SelectionGeometry,
): boolean {
  const rect = element.getBoundingClientRect()
  const box = geometry.boundingBox
  return (
    rect.right >= box.x &&
    rect.left <= box.x + box.width &&
    rect.bottom >= box.y &&
    rect.top <= box.y + box.height
  )
}
