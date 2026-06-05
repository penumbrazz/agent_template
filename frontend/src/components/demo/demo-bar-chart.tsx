'use client'

import type { EChartsOption } from 'echarts'
import { DemoEchartsWrapper } from './demo-echarts-wrapper'

const months = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

const onlineSales = [82, 93, 90, 104, 112, 120, 135, 148, 142, 156, 168, 185]
const offlineSales = [68, 72, 65, 78, 85, 90, 88, 95, 92, 98, 105, 110]

const option: EChartsOption = {
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['线上销售', '线下销售'],
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
    name: '万元',
    nameTextStyle: { fontSize: 11 },
    axisLabel: { fontSize: 11 },
  },
  series: [
    {
      name: '线上销售',
      type: 'bar',
      data: months.map((m, i) => [m, onlineSales[i]]),
      itemStyle: { color: '#cc785c' },
    },
    {
      name: '线下销售',
      type: 'bar',
      data: months.map((m, i) => [m, offlineSales[i]]),
      itemStyle: { color: '#5db8a6' },
    },
  ],
}

export function DemoBarChart() {
  return (
    <DemoEchartsWrapper
      option={option}
      title="月度销售额"
      testId="demo-bar-chart"
    />
  )
}
