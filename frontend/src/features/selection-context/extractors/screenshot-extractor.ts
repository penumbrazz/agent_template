import { translate } from '@/i18n'

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
      label: translate('selection.screenshotLabel'),
      geometry,
      summary: translate('selection.screenshotSummary'),
      resourceId: `selection://screenshot/${geometry.id}`,
      delivery,
    },
  ]
}
