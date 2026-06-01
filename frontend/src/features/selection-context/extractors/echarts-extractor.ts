import { translate } from '@/i18n'
import { distanceToPath, isPointInPolygon } from '../geometry'
import type { ChartSelectionArtifact, SelectionGeometry } from '../types'
import { intersectsSelection } from './geometry-utils'
import { getSelectableCharts } from './echarts-registry'

const PATH_DISTANCE_THRESHOLD = 8

export async function extractEchartsSelection(
  geometry: SelectionGeometry,
): Promise<ChartSelectionArtifact[]> {
  return getSelectableCharts()
    .filter((chart) => intersectsSelection(chart.element, geometry))
    .flatMap((chart): ChartSelectionArtifact[] => {
      const selectedPoints = chart.getPoints().filter((point) => {
        const screenPoint = { x: point.screenX, y: point.screenY }
        return (
          isPointInPolygon(screenPoint, geometry.path) ||
          distanceToPath(screenPoint, geometry.path) <= PATH_DISTANCE_THRESHOLD
        )
      })

      if (selectedPoints.length === 0) {
        return []
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
      return [
        {
          id: `artifact-chart-${geometry.id}`,
          kind: 'chart' as const,
          label: translate('selection.chartLabel', {
            title: chart.title,
            points: String(selectedPoints.length),
          }),
          geometry,
          summary: translate('selection.chartSummary', {
            title: chart.title,
            points: String(selectedPoints.length),
          }),
          chartTitle: chart.title,
          chartTestId,
          selectedSeries,
          xRange: {
            min: selectedPoints[0].x,
            max: selectedPoints[selectedPoints.length - 1].x,
          },
        } satisfies ChartSelectionArtifact,
      ]
    })
}
