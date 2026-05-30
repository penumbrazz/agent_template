import { extractDomSelection } from '../extractors/dom-extractor'
import type { SelectionGeometry } from '../types'

function geometry(): SelectionGeometry {
  return {
    id: 'selection-dom',
    path: [{ x: 0, y: 0 }],
    boundingBox: { x: 0, y: 0, width: 200, height: 100 },
    viewport: { width: 400, height: 300, scrollX: 0, scrollY: 0 },
    createdAt: '2026-05-30T00:00:00.000Z',
  }
}

describe('extractDomSelection', () => {
  it('extracts visible text and data-testid from intersecting elements', async () => {
    document.body.innerHTML = `
      <main>
        <button data-testid="save-button" aria-label="保存">保存订单</button>
      </main>
    `
    const button = document.querySelector('button') as HTMLButtonElement
    button.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 10,
        width: 100,
        height: 40,
        top: 10,
        left: 10,
        right: 110,
        bottom: 50,
      }) as DOMRect

    const result = await extractDomSelection(geometry())

    expect(result[0]).toMatchObject({
      kind: 'dom',
      text: '保存订单',
      testIds: ['save-button'],
    })
  })
})
