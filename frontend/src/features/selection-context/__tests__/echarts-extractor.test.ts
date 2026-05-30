import {
  clearSelectableCharts,
  registerSelectableChart,
} from '../extractors/echarts-registry'
import { extractEchartsSelection } from '../extractors/echarts-extractor'
import type { SelectionGeometry } from '../types'

const geometry: SelectionGeometry = {
  id: 'selection-chart',
  path: [
    { x: 10, y: 10 },
    { x: 80, y: 10 },
    { x: 80, y: 80 },
    { x: 10, y: 80 },
  ],
  boundingBox: { x: 10, y: 10, width: 70, height: 70 },
  viewport: { width: 400, height: 300, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('extractEchartsSelection', () => {
  afterEach(() => clearSelectableCharts())

  it('extracts selected points from registered chart', async () => {
    const element = document.createElement('div')
    element.dataset.testid = 'orders-trend-chart'
    element.dataset.selectionTitle = '订单趋势'
    element.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        top: 0,
        left: 0,
        right: 200,
        bottom: 120,
      }) as DOMRect
    document.body.appendChild(element)

    registerSelectableChart({
      element,
      title: '订单趋势',
      getPoints: () => [
        {
          seriesName: '支付订单数',
          x: '2026-05-01',
          y: 128,
          screenX: 20,
          screenY: 40,
        },
        {
          seriesName: '支付订单数',
          x: '2026-05-02',
          y: 142,
          screenX: 60,
          screenY: 35,
        },
        {
          seriesName: '支付订单数',
          x: '2026-05-10',
          y: 88,
          screenX: 160,
          screenY: 100,
        },
      ],
    })

    const result = await extractEchartsSelection(geometry)

    expect(result[0]).toMatchObject({
      kind: 'chart',
      chartTitle: '订单趋势',
      chartTestId: 'orders-trend-chart',
    })
    expect(result[0].selectedSeries[0].points).toHaveLength(2)
  })
})
