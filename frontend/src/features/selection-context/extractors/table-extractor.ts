import { translate } from '@/i18n'
import type { SelectionGeometry, TableSelectionArtifact } from '../types'
import { intersectsSelection } from './geometry-utils'

export async function extractTableSelection(
  geometry: SelectionGeometry,
): Promise<TableSelectionArtifact[]> {
  const tables = Array.from(
    document.querySelectorAll<HTMLTableElement>('table'),
  )
  const artifacts = tables
    .map((table) => extractFromTable(table, geometry))
    .filter((artifact): artifact is TableSelectionArtifact => Boolean(artifact))

  return artifacts
}

function extractFromTable(
  table: HTMLTableElement,
  geometry: SelectionGeometry,
): TableSelectionArtifact | null {
  const columns = Array.from(table.querySelectorAll('thead th')).map(
    (cell) => cell.textContent?.trim() ?? '',
  )
  const rows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>('tbody tr'),
  )
    .filter((row) => intersectsSelection(row, geometry))
    .map((row) => {
      const values = Array.from(row.querySelectorAll('td')).map(
        (cell) => cell.textContent?.trim() ?? '',
      )
      return Object.fromEntries(
        values.map((value, index) => [
          columns[index] ??
            translate('selection.columnFallback', { index: String(index + 1) }),
          value,
        ]),
      )
    })

  if (rows.length === 0) {
    return null
  }

  const tableTitle =
    table.dataset.selectionTitle ||
    table.getAttribute('aria-label') ||
    undefined

  return {
    id: `artifact-table-${geometry.id}`,
    kind: 'table',
    label: tableTitle
      ? translate('selection.tableLabel', {
          title: tableTitle,
          rows: String(rows.length),
        })
      : translate('selection.tableLabelNoTitle', { rows: String(rows.length) }),
    geometry,
    summary: translate('selection.tableSummary', {
      columns: columns.join(', '),
      rows: String(rows.length),
    }),
    tableTitle,
    columns,
    rows,
  }
}
