import type {
  ScreenshotDelivery,
  ScreenshotSelectionArtifact,
  SelectionGeometry,
} from '../types'

export async function extractScreenshotSelection(
  geometry: SelectionGeometry,
  delivery: ScreenshotDelivery,
): Promise<ScreenshotSelectionArtifact[]> {
  return [
    {
      id: `artifact-screenshot-${geometry.id}`,
      kind: 'screenshot',
      label: '截图区域',
      geometry,
      summary: '截图证据已按引用保存，默认不进入模型上下文',
      resourceId: `selection://screenshot/${geometry.id}`,
      delivery,
    },
  ]
}
