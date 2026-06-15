'use client'

import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useT } from '@/i18n'
import { themeColor, type ThemeColorName } from '@/lib/theme-colors'
import { DemoEchartsWrapper } from './demo-echarts-wrapper'

// Fallback hex values mirror DESIGN.md so charts still render in SSR/tests
// before CSS variables resolve. `themeColor()` swaps them for the live token
// at runtime.
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

const onlineSales = [82, 93, 90, 104, 112, 120, 135, 148, 142, 156, 168, 185]
const offlineSales = [68, 72, 65, 78, 85, 90, 88, 95, 92, 98, 105, 110]

export function DemoBarChart() {
  const t = useT()

  const option = useMemo<EChartsOption>(() => {
    const months = MONTH_KEYS.map((k) => t(k))
    const onlineLabel = t('demo.barSeries.online')
    const offlineLabel = t('demo.barSeries.offline')

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: [onlineLabel, offlineLabel],
        top: 8,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 48, right: 16, top: 48, bottom: 32 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: t('demo.units.tenThousandYuan'),
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          name: onlineLabel,
          type: 'bar',
          data: months.map((m, i) => [m, onlineSales[i]]),
          itemStyle: {
            color: themeColor('primary', COLOR_FALLBACKS.primary),
          },
        },
        {
          name: offlineLabel,
          type: 'bar',
          data: months.map((m, i) => [m, offlineSales[i]]),
          itemStyle: {
            color: themeColor('accentTeal', COLOR_FALLBACKS.accentTeal),
          },
        },
      ],
    }
  }, [t])

  return (
    <DemoEchartsWrapper
      option={option}
      title={t('demo.barChartTitle')}
      testId="demo-bar-chart"
    />
  )
}
