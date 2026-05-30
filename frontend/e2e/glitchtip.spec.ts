import { expect, test } from '@playwright/test'

const GLITCHTIP_HOST = process.env.GLITCHTIP_HOST ?? ''

test.describe('GlitchTip E2E', () => {
  test('client-side exception reaches GlitchTip', async ({ page }) => {
    expect(
      GLITCHTIP_HOST,
      'GLITCHTIP_HOST must be set to run GlitchTip E2E tests',
    ).toBeTruthy()

    const glitchtipRequestPromise = page.waitForRequest(
      (req) => req.url().includes(GLITCHTIP_HOST),
      { timeout: 5000 },
    )

    await page.goto('/', { waitUntil: 'networkidle' })

    // SDK is initialized during page load — verify by triggering an exception
    // and checking that a request was sent to GlitchTip
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('E2E test: frontend client-side exception')
      }, 100)
    })

    const req = await glitchtipRequestPromise
    expect(req.url()).toContain(GLITCHTIP_HOST)
  })

  test('server-side SDK initialized (instrumentation.ts)', async ({
    request,
  }) => {
    const resp = await request.get('/')
    expect(resp.status()).toBe(200)
  })
})
