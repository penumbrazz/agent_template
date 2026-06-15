import { expect, test } from '@playwright/test'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function registerAndLogin(page: import('@playwright/test').Page) {
  const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'shotsel',
      email: 'shotsel@test.com',
      password: 'shotspass123',
    }),
  })
  if (!registerRes.ok && registerRes.status !== 409) {
    throw new Error(
      `Registration failed: ${registerRes.status} ${await registerRes.text()}`,
    )
  }

  await page.goto('/login')
  await page.getByTestId('login-username-input').fill('shotsel')
  await page.getByTestId('login-password-input').fill('shotspass123')
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL('/')
}

test.describe('Selection screenshot artifact', () => {
  test('produces a screenshot attachment chip when selecting a blank area', async ({
    page,
  }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()

    // Enter selection mode.
    await page.getByTestId('selection-tool-button').click()
    await expect(page.getByTestId('selection-overlay')).toBeVisible()

    // The default selection context policy is
    //   { mode: 'hybrid', screenshotPolicy: 'always', screenshotDelivery: 'reference_only' }
    // which means every selection yields a screenshot artifact, even when no
    // semantic extractor (dom/table/chart) matches.
    //
    // To guarantee that ONLY the screenshot extractor matches (and thus only a
    // single screenshot chip is produced), we drag-select a small region inside
    // the page's top-left padding: the <main> element uses `min-h-screen` with
    // no text/role/testid of its own, and the hero <section> starts at pt-12
    // (48px top inset). Coordinates (x: 8..56, y: 8..40) sit fully inside the
    // empty padding, so dom-extractor returns [] (no text/testId/role), and no
    // table/chart lives there either.
    await page.mouse.move(8, 8)
    await page.mouse.down()
    await page.mouse.move(56, 8)
    await page.mouse.move(56, 40)
    await page.mouse.up()

    // Attachment list shows up with exactly one chip...
    await expect(page.getByTestId('agent-chat-attachment-list')).toBeVisible()
    await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(1)

    // ...and that chip is classified as a screenshot.
    await expect(
      page.locator(
        '[data-testid="agent-chat-attachment-chip"][data-attachment-kind="screenshot"]',
      ),
    ).toBeVisible()
    await expect(
      page.locator(
        '[data-testid="agent-chat-attachment-chip"][data-attachment-kind="screenshot"]',
      ),
    ).toHaveCount(1)
  })
})
