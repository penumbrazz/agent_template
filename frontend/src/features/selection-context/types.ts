export type SelectionContextMode = 'semantic' | 'screenshot' | 'hybrid'

export type ScreenshotPolicy = 'never' | 'on_extractor_miss' | 'always'

export type ScreenshotDelivery = 'reference_only' | 'inline_image'

export interface SelectionContextPolicy {
  mode: SelectionContextMode
  screenshotPolicy: ScreenshotPolicy
  screenshotDelivery: ScreenshotDelivery
}

export interface SelectionPoint {
  x: number
  y: number
}

export interface SelectionBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface SelectionGeometry {
  id: string
  path: SelectionPoint[]
  boundingBox: SelectionBoundingBox
  viewport: {
    width: number
    height: number
    scrollX: number
    scrollY: number
  }
  createdAt: string
}

export type SelectionArtifactKind = 'dom' | 'table' | 'chart' | 'screenshot'

export interface SelectionArtifactBase {
  id: string
  kind: SelectionArtifactKind
  label: string
  geometry: SelectionGeometry
  summary: string
}

export interface DomSelectionArtifact extends SelectionArtifactBase {
  kind: 'dom'
  text: string
  testIds: string[]
  roles: string[]
}

export interface TableSelectionArtifact extends SelectionArtifactBase {
  kind: 'table'
  tableTitle?: string
  columns: string[]
  rows: Array<Record<string, string>>
}

export interface ChartSelectionArtifact extends SelectionArtifactBase {
  kind: 'chart'
  chartTitle: string
  chartTestId?: string
  selectedSeries: Array<{
    name: string
    points: Array<{
      x: string | number
      y: number
      label?: string
      raw?: unknown
    }>
  }>
  xRange?: { min: string | number; max: string | number }
}

export interface ScreenshotSelectionArtifact extends SelectionArtifactBase {
  kind: 'screenshot'
  resourceId: string
  delivery: ScreenshotDelivery
}

export type SelectionArtifact =
  | DomSelectionArtifact
  | TableSelectionArtifact
  | ChartSelectionArtifact
  | ScreenshotSelectionArtifact

export interface ChatAttachment {
  id: string
  label: string
  artifact: SelectionArtifact
}
