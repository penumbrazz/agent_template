import { test, expect } from '@playwright/test'

test.describe('Account Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
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
    await expect(page.getByText('确定要退出登录吗？')).toBeVisible()

    // Cancel
    await page.click('[data-testid="logout-cancel-button"]')
    await expect(page.getByText('确定要退出登录吗？')).not.toBeVisible()

    // Still on settings page
    await expect(page.locator('[data-testid="account-settings"]')).toBeVisible()
  })

  test('logs out successfully', async ({ page }) => {
    await page.click('[data-testid="logout-button"]')
    await expect(page.getByText('确定要退出登录吗？')).toBeVisible()

    await page.click('[data-testid="logout-confirm-button"]')

    // Redirected to login page
    await expect(page).toHaveURL('/login', { timeout: 5000 })
  })
})
