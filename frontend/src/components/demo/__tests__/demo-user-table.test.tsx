import '@testing-library/jest-dom'

import { render } from '@testing-library/react'
import { DemoUserTable } from '../demo-user-table'

// Demo table renders via i18n; default locale is `en`, so the localized
// labels below are the English ones from src/i18n/locales/en.ts.
describe('DemoUserTable', () => {
  it('renders the table with correct selection attributes', () => {
    const { container } = render(<DemoUserTable />)

    const table = container.querySelector(
      '[data-testid="demo-user-table"]',
    ) as HTMLElement
    expect(table).toBeInTheDocument()
    expect(table).toHaveAttribute('data-selection-title', 'User data table')
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
    expect(headers).toContain('User ID')
    expect(headers).toContain('Name')
    expect(headers).toContain('Email')
    expect(headers).toContain('Registered')
    expect(headers).toContain('Spending')
    expect(headers).toContain('Status')
  })

  it('renders status badges with testids', () => {
    const { container } = render(<DemoUserTable />)

    const statusU001 = container.querySelector('[data-testid="status-U001"]')
    expect(statusU001?.textContent).toBe('Active')

    const statusU004 = container.querySelector('[data-testid="status-U004"]')
    expect(statusU004?.textContent).toBe('VIP')

    const statusU003 = container.querySelector('[data-testid="status-U003"]')
    expect(statusU003?.textContent).toBe('Dormant')
  })
})
