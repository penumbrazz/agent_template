import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { DemoUserTable } from '../demo-user-table'

describe('DemoUserTable', () => {
  it('renders the table with correct selection attributes', () => {
    const { container } = render(<DemoUserTable />)

    const table = container.querySelector(
      '[data-testid="demo-user-table"]',
    ) as HTMLElement
    expect(table).toBeInTheDocument()
    expect(table).toHaveAttribute('data-selection-title', '用户数据表')
  })

  it('renders all 12 user rows', () => {
    const { container } = render(<DemoUserTable />)

    const rows = container.querySelectorAll('[data-testid^="user-row-"]')
    expect(rows).toHaveLength(12)
  })

  it('renders correct table headers', () => {
    const { container } = render(<DemoUserTable />)

    const headers = Array.from(container.querySelectorAll('th')).map(
      (th) => th.textContent,
    )
    expect(headers).toContain('用户 ID')
    expect(headers).toContain('姓名')
    expect(headers).toContain('邮箱')
    expect(headers).toContain('注册日期')
    expect(headers).toContain('消费金额')
    expect(headers).toContain('状态')
  })

  it('renders status badges with testids', () => {
    const { container } = render(<DemoUserTable />)

    const statusU001 = container.querySelector('[data-testid="status-U001"]')
    expect(statusU001?.textContent).toBe('活跃')

    const statusU004 = container.querySelector('[data-testid="status-U004"]')
    expect(statusU004?.textContent).toBe('VIP')

    const statusU003 = container.querySelector('[data-testid="status-U003"]')
    expect(statusU003?.textContent).toBe('休眠')
  })
})
