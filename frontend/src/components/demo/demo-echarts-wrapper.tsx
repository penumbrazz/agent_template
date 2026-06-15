'use client'

import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useEffect, useRef, useCallback } from 'react'
import {
  registerSelectableChart,
  type SelectableChartPoint,
} from '@/features/selection-context/extractors/echarts-registry'

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

interface DemoEchartsWrapperProps {
  option: EChartsOption
  title: string
  testId: string
  className?: string
}

export function DemoEchartsWrapper({
  option,
  title,
  testId,
  className,
}: DemoEchartsWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const getPoints = useCallback((): SelectableChartPoint[] => {
    const chart = chartRef.current
    if (!chart) return []

    const points: SelectableChartPoint[] = []
    const series = option.series
    if (!Array.isArray(series)) return points

    for (const s of series) {
      const seriesName = typeof s.name === 'string' ? s.name : 'unknown'
      const data = s.data
      if (!Array.isArray(data)) continue

      for (const item of data) {
        if (!Array.isArray(item)) continue

        const xVal = item[0] as string | number
        const yVal = item[1] as number

        try {
          const pixel = chart.convertToPixel('grid', [xVal, yVal])
          if (!pixel) continue

          const rect = containerRef.current?.getBoundingClientRect()
          if (!rect) continue

          points.push({
            seriesName,
            x: xVal,
            y: yVal,
            screenX: rect.left + (pixel as number[])[0],
            screenY: rect.top + (pixel as number[])[1],
            label: `${seriesName}: ${xVal} / ${yVal}`,
          })
        } catch {
          // convertToPixel can throw if chart not ready
        }
      }
    }

    return points
  }, [option])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = echarts.init(container)
    chartRef.current = chart
    chart.setOption(option)

    const unregister = registerSelectableChart({
      element: container,
      title,
      getPoints,
    })

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      unregister()
      chart.dispose()
      chartRef.current = null
    }
  }, [option, title, getPoints])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      data-selection-title={title}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
