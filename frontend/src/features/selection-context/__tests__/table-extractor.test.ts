import { extractTableSelection } from '../extractors/table-extractor'
import type { SelectionGeometry } from '../types'

const selection: SelectionGeometry = {
  id: 'selection-table',
  path: [{ x: 0, y: 0 }],
  boundingBox: { x: 0, y: 40, width: 400, height: 40 },
  viewport: { width: 800, height: 600, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('extractTableSelection', () => {
  it('extracts selected table rows with column names', async () => {
    document.body.innerHTML = `
      <table data-selection-title="订单明细">
        <thead><tr><th>日期</th><th>订单数</th></tr></thead>
        <tbody><tr><td>2026-05-01</td><td>128</td></tr></tbody>
      </table>
    `
    const row = document.querySelector('tbody tr') as HTMLTableRowElement
    row.getBoundingClientRect = () =>
      ({ x: 0, y: 45, width: 300, height: 30, top: 45, left: 0, right: 300, bottom: 75 } as DOMRect)

    const result = await extractTableSelection(selection)

    expect(result[0]).toMatchObject({
      kind: 'table',
      tableTitle: '订单明细',
      columns: ['日期', '订单数'],
      rows: [{ 日期: '2026-05-01', 订单数: '128' }],
    })
  })
})
