import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import {
  clearSelectableCharts,
  getSelectableCharts,
} from '@/features/selection-context/extractors/echarts-registry'
import { DemoEchartsWrapper } from '../demo-echarts-wrapper'

jest.mock('echarts/core', () => ({
  init: jest.fn(() => ({
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
    convertToPixel: jest.fn(() => [100, 200]),
  })),
  use: jest.fn(),
}))

jest.mock('echarts/charts', () => ({
  BarChart: {},
  LineChart: {},
}))

jest.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
}))

jest.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('DemoEchartsWrapper', () => {
  afterEach(() => {
    clearSelectableCharts()
  })

  it('renders container with correct data attributes', () => {
    const { container } = render(
      <DemoEchartsWrapper
        option={{ series: [] }}
        title="Test Chart"
        testId="test-chart"
      />,
    )

    const chartEl = container.querySelector('[data-testid="test-chart"]')
    expect(chartEl).toBeInTheDocument()
    expect(chartEl).toHaveAttribute('data-selection-title', 'Test Chart')
  })

  it('registers with the selectable chart registry', () => {
    render(
      <DemoEchartsWrapper
        option={{ series: [] }}
        title="Registry Chart"
        testId="registry-chart"
      />,
    )

    const charts = getSelectableCharts()
    expect(charts).toHaveLength(1)
    expect(charts[0].title).toBe('Registry Chart')
  })

  it('unregisters on unmount', () => {
    const { unmount } = render(
      <DemoEchartsWrapper
        option={{ series: [] }}
        title="Cleanup Chart"
        testId="cleanup-chart"
      />,
    )

    expect(getSelectableCharts()).toHaveLength(1)
    unmount()
    expect(getSelectableCharts()).toHaveLength(0)
  })
})
