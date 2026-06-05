'use client'

import { DemoBarChart } from './demo-bar-chart'
import { DemoLineChart } from './demo-line-chart'
import { DemoUserTable } from './demo-user-table'

export function DemoDataSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24" data-testid="demo-data-section">
      <h2 className="mb-8 text-lg font-display font-normal text-text-primary">
        数据展示区
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className="rounded-lg bg-surface-card p-4"
          data-testid="bar-chart-container"
        >
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            月度销售额
          </h3>
          <div className="h-72">
            <DemoBarChart />
          </div>
        </div>
        <div
          className="rounded-lg bg-surface-card p-4"
          data-testid="line-chart-container"
        >
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            用户增长趋势
          </h3>
          <div className="h-72">
            <DemoLineChart />
          </div>
        </div>
      </div>

      <div
        className="mt-6 rounded-lg bg-surface-card p-4"
        data-testid="table-container"
      >
        <h3 className="mb-3 text-sm font-medium text-text-secondary">
          用户数据表
        </h3>
        <DemoUserTable />
      </div>
    </section>
  )
}
