import { test, expect } from '@playwright/test'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login via API
    const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
      }),
    })

    // Register may fail if user already exists, that's fine
    if (registerRes.ok) {
      // Login to get cookies set
      await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpassword123' }),
      })
    }

    // Login via the login page to establish session
    await page.goto('/login')
    await page.getByTestId('login-username-input').fill('testuser')
    await page.getByTestId('login-password-input').fill('testpassword123')
    await page.getByTestId('login-submit-button').click()
    await page.waitForURL('/')

    // Open settings panel
    await page.click('[data-testid="settings-trigger"]')
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible()

    // Switch to account tab
    await page.click('[data-testid="tab-account"]')
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible()
  })

  test('displays username and email', async ({ page }) => {
    await expect(page.locator('[data-testid="account-settings"]')).toContainText('testuser')
    await expect(page.locator('[data-testid="account-settings"]')).toContainText('test@example.com')
  })

  test('shows logout confirmation dialog and cancels', async ({ page }) => {
    await page.click('[data-testid="logout-button"]')

    // Confirmation dialog appears
    const confirmDesc = page.getByTestId('logout-confirm-desc')
    await expect(confirmDesc).toBeVisible()

    // Cancel
    await page.click('[data-testid="logout-cancel-button"]')
    await expect(confirmDesc).not.toBeVisible()

    // Still on settings page
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible()
  })

  test('logs out successfully', async ({ page }) => {
    await page.click('[data-testid="logout-button"]')
    await expect(page.getByTestId('logout-confirm-desc')).toBeVisible()

    await page.click('[data-testid="logout-confirm-button"]')

    // Redirected to login page
    await expect(page).toHaveURL('/login', { timeout: 5000 })
  })
})
