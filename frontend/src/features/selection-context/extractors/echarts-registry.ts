export interface SelectableChartPoint {
  seriesName: string
  x: string | number
  y: number
  screenX: number
  screenY: number
  label?: string
  raw?: unknown
}

export interface SelectableChartRegistration {
  element: HTMLElement
  title: string
  getPoints: () => SelectableChartPoint[]
}

const charts = new Set<SelectableChartRegistration>()

export function registerSelectableChart(
  chart: SelectableChartRegistration,
): () => void {
  charts.add(chart)
  return () => charts.delete(chart)
}

export function getSelectableCharts(): SelectableChartRegistration[] {
  return Array.from(charts)
}

export function clearSelectableCharts() {
  charts.clear()
}
