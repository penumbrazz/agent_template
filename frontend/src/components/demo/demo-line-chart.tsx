'use client'

import type { EChartsOption } from 'echarts'
import { DemoEchartsWrapper } from './demo-echarts-wrapper'

const months = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

const newUsers = [320, 410, 380, 520, 590, 640, 780, 850, 720, 890, 960, 1120]
const activeUsers = [
  2100, 2350, 2480, 2720, 3100, 3450, 3800, 4200, 4050, 4500, 4850, 5300,
]

const option: EChartsOption = {
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['新增用户', '活跃用户'],
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
    name: '人数',
    nameTextStyle: { fontSize: 11 },
    axisLabel: { fontSize: 11 },
  },
  series: [
    {
      name: '新增用户',
      type: 'line',
      data: months.map((m, i) => [m, newUsers[i]]),
      smooth: true,
      itemStyle: { color: '#cc785c' },
      lineStyle: { width: 2 },
    },
    {
      name: '活跃用户',
      type: 'line',
      data: months.map((m, i) => [m, activeUsers[i]]),
      smooth: true,
      itemStyle: { color: '#e8a55a' },
      lineStyle: { width: 2 },
    },
  ],
}

export function DemoLineChart() {
  return (
    <DemoEchartsWrapper
      option={option}
      title="用户增长趋势"
      testId="demo-line-chart"
    />
  )
}
