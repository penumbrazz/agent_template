import type { SelectionGeometry, TableSelectionArtifact } from '../types'

export async function extractTableSelection(
  geometry: SelectionGeometry,
): Promise<TableSelectionArtifact[]> {
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'))
  const artifacts = tables
    .map((table) => extractFromTable(table, geometry))
    .filter((artifact): artifact is TableSelectionArtifact => Boolean(artifact))

  return artifacts
}

function extractFromTable(
  table: HTMLTableElement,
  geometry: SelectionGeometry,
): TableSelectionArtifact | null {
  const columns = Array.from(table.querySelectorAll('thead th')).map((cell) =>
    cell.textContent?.trim() ?? '',
  )
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'))
    .filter((row) => intersectsSelection(row, geometry))
    .map((row) => {
      const values = Array.from(row.querySelectorAll('td')).map(
        (cell) => cell.textContent?.trim() ?? '',
      )
      return Object.fromEntries(
        values.map((value, index) => [columns[index] ?? `列 ${index + 1}`, value]),
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
    label: tableTitle ? `表格 · ${tableTitle} · ${rows.length} 行` : `表格 · ${rows.length} 行`,
    geometry,
    summary: `${columns.join(', ')}；选中 ${rows.length} 行`,
    tableTitle,
    columns,
    rows,
  }
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
