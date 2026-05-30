import { translate } from '@/i18n'
import type { DomSelectionArtifact, SelectionGeometry } from '../types'
import { intersectsSelection } from './geometry-utils'

export async function extractDomSelection(
  geometry: SelectionGeometry,
): Promise<DomSelectionArtifact[]> {
  const elements = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
    .filter((element) => intersectsSelection(element, geometry))
    .filter(isVisible)

  const text = Array.from(
    new Set(
      elements
        .map((element) => (element.textContent ?? '').trim())
        .filter(Boolean),
    ),
  ).join('\n')
  const testIds = Array.from(
    new Set(
      elements
        .map((element) => element.dataset.testid)
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const roles = Array.from(
    new Set(
      elements
        .map((element) => element.getAttribute('role'))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  if (!text && testIds.length === 0 && roles.length === 0) {
    return []
  }

  return [
    {
      id: `artifact-dom-${geometry.id}`,
      kind: 'dom',
      label: translate('selection.domLabel'),
      geometry,
      summary: text.slice(0, 120) || testIds.join(', '),
      text,
      testIds,
      roles,
    },
  ]
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}
