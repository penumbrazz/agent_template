'use client'

import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useT } from '@/i18n'
import { themeColor, type ThemeColorName } from '@/lib/theme-colors'
import { DemoEchartsWrapper } from './demo-echarts-wrapper'

// See demo-bar-chart.tsx — fallbacks keep SSR/tests legible before CSS vars
// resolve; themeColor swaps them for live tokens at runtime.
const COLOR_FALLBACKS: Record<ThemeColorName, string> = {
  primary: '#cc785c',
  primaryActive: '#a9583e',
  primaryDisabled: '#e6dfd8',
  accentTeal: '#5db8a6',
  accentAmber: '#e8a55a',
  success: '#5db872',
  warning: '#d4a017',
  error: '#c64545',
  surfaceDark: '#181715',
  onDark: '#faf9f5',
  onPrimary: '#ffffff',
}

const MONTH_KEYS = [
  'demo.months.jan',
  'demo.months.feb',
  'demo.months.mar',
  'demo.months.apr',
  'demo.months.may',
  'demo.months.jun',
  'demo.months.jul',
  'demo.months.aug',
  'demo.months.sep',
  'demo.months.oct',
  'demo.months.nov',
  'demo.months.dec',
] as const

const newUsers = [320, 410, 380, 520, 590, 640, 780, 850, 720, 890, 960, 1120]
const activeUsers = [
  2100, 2350, 2480, 2720, 3100, 3450, 3800, 4200, 4050, 4500, 4850, 5300,
]

export function DemoLineChart() {
  const t = useT()

  const option = useMemo<EChartsOption>(() => {
    const months = MONTH_KEYS.map((k) => t(k))
    const newLabel = t('demo.lineSeries.new')
    const activeLabel = t('demo.lineSeries.active')

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: [newLabel, activeLabel],
        top: 8,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 56, right: 16, top: 48, bottom: 32 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: t('demo.units.personCount'),
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          name: newLabel,
          type: 'line',
          data: months.map((m, i) => [m, newUsers[i]]),
          smooth: true,
          itemStyle: {
            color: themeColor('primary', COLOR_FALLBACKS.primary),
          },
          lineStyle: { width: 2 },
        },
        {
          name: activeLabel,
          type: 'line',
          data: months.map((m, i) => [m, activeUsers[i]]),
          smooth: true,
          itemStyle: {
            color: themeColor('accentAmber', COLOR_FALLBACKS.accentAmber),
          },
          lineStyle: { width: 2 },
        },
      ],
    }
  }, [t])

  return (
    <DemoEchartsWrapper
      option={option}
      title={t('demo.lineChartTitle')}
      testId="demo-line-chart"
    />
  )
}
