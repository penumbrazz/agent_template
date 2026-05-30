import { expect, test } from '@playwright/test'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function registerAndLogin(page: import('@playwright/test').Page) {
  const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'chatuser',
      email: 'chat@test.com',
      password: 'chatpass123',
    }),
  })
  if (!registerRes.ok && registerRes.status !== 409) {
    throw new Error(
      `Registration failed: ${registerRes.status} ${await registerRes.text()}`,
    )
  }

  await page.goto('/login')
  await page.getByTestId('login-username-input').fill('chatuser')
  await page.getByTestId('login-password-input').fill('chatpass123')
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL('/')
}

test.describe('Agent Chat Panel', () => {
  test('opens, minimizes, and reopens as floating panel', async ({ page }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()
    await expect(page.getByTestId('agent-chat-panel')).toBeVisible()
    await page.getByTestId('agent-chat-minimize-button').click()
    await expect(page.getByTestId('agent-chat-panel')).not.toBeVisible()
    await page.getByTestId('agent-chat-minimized-button').click()
    await expect(page.getByTestId('agent-chat-dock-button')).toBeVisible()
  })

  test('keeps floating panel inside the viewport while dragging', async ({
    page,
  }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()

    const handle = page.getByTestId('agent-chat-drag-handle')
    const panel = page.getByTestId('agent-chat-panel')
    const handleBox = await handle.boundingBox()
    expect(handleBox).not.toBeNull()

    await page.mouse.move(handleBox!.x + 20, handleBox!.y + 20)
    await page.mouse.down()
    await page.mouse.move(-500, -500)
    await page.mouse.up()

    const panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(panelBox!.x).toBeGreaterThanOrEqual(0)
    expect(panelBox!.y).toBeGreaterThanOrEqual(0)
  })

  test('docks, resizes, persists width, and restores floating mode', async ({
    page,
  }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()
    await page.getByTestId('agent-chat-dock-button').click()

    const panel = page.getByTestId('agent-chat-panel')
    await expect(page.getByTestId('agent-chat-resize-handle')).toBeVisible()

    const before = await panel.boundingBox()
    const handleBox = await page
      .getByTestId('agent-chat-resize-handle')
      .boundingBox()
    expect(before).not.toBeNull()
    expect(handleBox).not.toBeNull()

    await page.mouse.move(handleBox!.x + 2, handleBox!.y + 80)
    await page.mouse.down()
    await page.mouse.move(handleBox!.x - 120, handleBox!.y + 80)
    await page.mouse.up()

    const after = await panel.boundingBox()
    expect(after).not.toBeNull()
    expect(after!.width).toBeGreaterThan(before!.width)

    await page.reload({ waitUntil: 'networkidle' })
    await page.getByTestId('agent-chat-minimized-button').click()
    await page.getByTestId('agent-chat-dock-button').click()

    const restored = await panel.boundingBox()
    expect(restored).not.toBeNull()
    expect(Math.round(restored!.width)).toBe(Math.round(after!.width))

    await page.getByTestId('agent-chat-restore-button').click()
    await expect(page.getByTestId('agent-chat-dock-button')).toBeVisible()
  })

  test('opens history drawer, switches sessions, and creates new conversation', async ({
    page,
  }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()
    await page.getByTestId('agent-chat-menu-button').click()
    await expect(page.getByTestId('agent-chat-history-drawer')).toBeVisible()

    await page.getByTestId('agent-chat-session-item-session-hello').click()
    await expect(page.getByTestId('agent-chat-history-drawer')).toHaveClass(
      /-translate-x-full/,
    )
    await expect(page.getByTestId('agent-chat-panel')).toContainText('你好')

    await page.getByTestId('agent-chat-new-conversation-button').click()
    await page.getByTestId('agent-chat-input').fill('写一个测试消息')
    await page.getByTestId('agent-chat-send-button').click()
    await expect(page.getByTestId('agent-chat-panel')).toContainText(
      '写一个测试消息',
    )
    await expect(page.getByTestId('agent-chat-panel')).toContainText(
      '本地 Mock 回复',
    )
  })

  test('creates selection attachment chips and sends them with a message', async ({
    page,
  }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()

    await page.getByTestId('selection-tool-button').click()
    await expect(page.getByTestId('selection-overlay')).toBeVisible()

    await page.mouse.move(80, 120)
    await page.mouse.down()
    await page.mouse.move(240, 120)
    await page.mouse.move(240, 220)
    await page.mouse.up()

    await expect(page.getByTestId('agent-chat-attachment-list')).toBeVisible()
    await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(1)

    await page.getByTestId('agent-chat-input').fill('解释这个区域')
    await page.getByTestId('agent-chat-send-button').click()

    await expect(page.getByTestId('agent-chat-panel')).toContainText(
      '解释这个区域',
    )
    await expect(
      page.getByTestId('agent-chat-attachment-list'),
    ).not.toBeVisible()
  })

  test('removes a pending selection attachment', async ({ page }) => {
    await registerAndLogin(page)
    await page.getByTestId('agent-chat-minimized-button').click()

    await page.getByTestId('selection-tool-button').click()
    await page.mouse.move(80, 120)
    await page.mouse.down()
    await page.mouse.move(220, 180)
    await page.mouse.up()

    await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(1)
    await page.getByTestId('agent-chat-attachment-remove').click()
    await expect(page.getByTestId('agent-chat-attachment-chip')).toHaveCount(0)
  })
})
