import { test, expect } from '@playwright/test'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Helper: direct API calls for test setup/teardown
async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function apiDelete(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`DELETE ${path} failed (${res.status}): ${text}`)
  }
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`GET ${path} failed (${res.status})`)
  }
  return res.json()
}

test.describe('Model Configuration', () => {
  // Track created resources for cleanup
  let createdProviderId: string | undefined
  let createdModelIds: string[] = []

  test.afterEach(async () => {
    // Clean up models then provider
    for (const id of createdModelIds) {
      await apiDelete(`/api/models/${id}`).catch((err) =>
        console.warn('Cleanup failed:', err.message),
      )
    }
    if (createdProviderId) {
      await apiDelete(`/api/providers/${createdProviderId}`).catch((err) =>
        console.warn('Cleanup failed:', err.message),
      )
    }
    createdProviderId = undefined
    createdModelIds = []
  })

  test('settings panel opens and shows tabs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Settings gear button should be visible
    const trigger = page.getByTestId('settings-trigger')
    await expect(trigger).toBeVisible()

    // Click to open settings panel
    await trigger.click()
    const panel = page.getByTestId('settings-panel')
    await expect(panel).toBeVisible()

    // Both tabs should be present
    await expect(page.getByTestId('tab-general')).toBeVisible()
    await expect(page.getByTestId('tab-models')).toBeVisible()
  })

  test('switch between general and model tabs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Default is models tab
    const modelsTab = page.getByTestId('tab-models')
    const generalTab = page.getByTestId('tab-general')

    // Switch to general
    await generalTab.click()
    await expect(page.getByTestId('general-settings')).toBeVisible()

    // Switch back to models
    await modelsTab.click()
    await expect(page.getByTestId('model-config')).toBeVisible()
  })

  test('add provider via dialog with test connection', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    await page.getByTestId('add-provider-button').click()
    const dialog = page.getByTestId('provider-form-dialog')
    await expect(dialog).toBeVisible()

    // Save should be disabled before test
    const saveBtn = page.getByTestId('provider-submit')
    await expect(saveBtn).toBeDisabled()

    // Fill form
    await page.getByTestId('provider-name-input').fill('E2E Test Provider')
    await page.getByTestId('provider-url-input').fill('https://api.example.com')
    await page.getByTestId('provider-key-input').fill('sk-test-key-123')

    // Test Connection button should be enabled
    const testBtn = page.getByTestId('test-connection-btn')
    await expect(testBtn).toBeEnabled()

    // Click test — will fail because the URL is not a real API
    await testBtn.click()

    // A toast error should appear
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]').first(),
    ).toBeVisible({ timeout: 10000 })

    // Save should still be disabled after failed test
    await expect(saveBtn).toBeDisabled()

    // Close dialog
    await page.getByTestId('provider-cancel').click()
    await expect(dialog).not.toBeVisible()
  })

  test('provider name input text is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()
    await page.getByTestId('add-provider-button').click()

    const input = page.getByTestId('provider-name-input')
    await expect(input).toBeVisible()

    // Type text and verify color contrast
    await input.fill('Test Visibility')
    const color = await input.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      }
    })

    // Text color should NOT be white (rgb(255, 255, 255))
    expect(color.color).not.toBe('rgb(255, 255, 255)')
    // Text color should be dark (ink)
    expect(color.color).toBe('rgb(20, 20, 19)')
    // Background should be cream canvas
    expect(color.backgroundColor).toBe('rgb(250, 249, 245)')

    // Cancel to close dialog
    await page.getByTestId('provider-cancel').click()
  })

  test('page background uses DESIGN.md cream canvas', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const bodyColors = await page.evaluate(() => {
      const body = document.body
      const style = window.getComputedStyle(body)
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      }
    })

    // Body background should be cream canvas (#faf9f5)
    expect(bodyColors.backgroundColor).toBe('rgb(250, 249, 245)')
    // Body text should be ink (#141413)
    expect(bodyColors.color).toBe('rgb(20, 20, 19)')
  })

  test('create provider, then manually add a model', async ({ page }) => {
    // Create provider via API for test setup
    const provider = await apiPost('/api/providers', {
      name: 'E2E Model Test',
      type: 'openai_compatible',
      base_url: 'https://api.e2e-test.com',
      api_key: 'sk-e2e-test',
    })
    createdProviderId = provider.id

    // Open settings and navigate to models
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Provider should be visible in list
    const providerItem = page.getByTestId(`provider-item-${provider.id}`)
    await expect(providerItem).toBeVisible()

    // Click on provider to select it
    await providerItem.click()

    // Click "手动添加" button
    await page.getByTestId('add-model-button').click()

    // Model form dialog should open
    const modelDialog = page.getByTestId('model-form-dialog')
    await expect(modelDialog).toBeVisible()

    // Fill model form
    await page.getByTestId('model-id-input').fill('e2e-test-model')
    await page.getByTestId('display-name-input').fill('E2E Test Model')

    // Submit
    await page.getByTestId('model-submit').click()

    // Dialog should close
    await expect(modelDialog).not.toBeVisible()

    // Verify model was created via API
    const models = await apiGet('/api/models/all')
    const created = models.find(
      (m: { model_id: string }) => m.model_id === 'e2e-test-model',
    )
    expect(created).toBeDefined()
    expect(created.display_name).toBe('E2E Test Model')
    expect(created.is_enabled).toBe(false)
    createdModelIds.push(created.id)
  })

  test('toggle model enable/disable', async ({ page }) => {
    // Setup: create provider and model via API
    const provider = await apiPost('/api/providers', {
      name: 'E2E Toggle Test',
      type: 'openai_compatible',
      base_url: 'https://api.e2e-toggle.com',
      api_key: 'sk-toggle-test',
    })
    createdProviderId = provider.id

    const model = await apiPost('/api/models', {
      provider_id: provider.id,
      model_id: 'toggle-test-model',
      display_name: 'Toggle Test',
    })
    createdModelIds.push(model.id)

    // Open settings and select provider
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    const providerItem = page.getByTestId(`provider-item-${provider.id}`)
    await providerItem.click()

    // Toggle model on
    const toggleBtn = page.getByTestId(`toggle-model-${model.id}`)
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()

    // Wait for SWR to update and verify via API
    await expect
      .poll(async () => {
        const models = await apiGet('/api/models/all')
        return models.find((m: { id: string }) => m.id === model.id)
      })
      .toHaveProperty('is_enabled', true)
    const models = await apiGet('/api/models/all')
    const updated = models.find((m: { id: string }) => m.id === model.id)
    expect(updated.is_enabled).toBe(true)
  })

  test('edit provider name without re-test', async ({ page }) => {
    // Setup
    const provider = await apiPost('/api/providers', {
      name: 'E2E Edit Before',
      type: 'openai_compatible',
      base_url: 'https://before.example.com',
      api_key: 'sk-edit-test',
    })
    createdProviderId = provider.id

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Click edit button on provider
    const editBtn = page.getByTestId(`edit-provider-${provider.id}`)
    await editBtn.click()

    // Edit dialog should open
    const dialog = page.getByTestId('provider-form-dialog')
    await expect(dialog).toBeVisible()

    // Name field should be pre-filled
    const nameInput = page.getByTestId('provider-name-input')
    await expect(nameInput).toHaveValue('E2E Edit Before')

    // Change name only — Save should be enabled (no connection fields changed)
    await nameInput.clear()
    await nameInput.fill('E2E Edit After')

    const saveBtn = page.getByTestId('provider-submit')
    await expect(saveBtn).toBeEnabled()

    // Submit
    await saveBtn.click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Verify via API
    const providers = await apiGet('/api/providers')
    const updated = providers.find((p: { id: string }) => p.id === provider.id)
    expect(updated.name).toBe('E2E Edit After')
  })

  test('delete model', async ({ page }) => {
    // Setup
    const provider = await apiPost('/api/providers', {
      name: 'E2E Delete Model',
      type: 'openai_compatible',
      base_url: 'https://delete-model.example.com',
      api_key: 'sk-delete-test',
    })
    createdProviderId = provider.id

    const model = await apiPost('/api/models', {
      provider_id: provider.id,
      model_id: 'delete-test-model',
    })
    // Don't add to createdModelIds — we'll delete it in the test

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    const providerItem = page.getByTestId(`provider-item-${provider.id}`)
    await providerItem.click()

    // Delete model
    const deleteBtn = page.getByTestId(`delete-model-${model.id}`)
    await deleteBtn.click()

    // Wait for update
    await expect
      .poll(async () => {
        const models = await apiGet('/api/models/all')
        return models.find((m: { id: string }) => m.id === model.id)
      })
      .toBeUndefined()

    // Verify model deleted via API
    const models = await apiGet('/api/models/all')
    const found = models.find((m: { id: string }) => m.id === model.id)
    expect(found).toBeUndefined()
  })

  test('delete provider cascades to models', async ({ page }) => {
    // Setup: create provider + model
    const provider = await apiPost('/api/providers', {
      name: 'E2E Cascade Delete',
      type: 'openai_compatible',
      base_url: 'https://cascade.example.com',
      api_key: 'sk-cascade-test',
    })

    const model = await apiPost('/api/models', {
      provider_id: provider.id,
      model_id: 'cascade-model',
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Delete provider
    const deleteBtn = page.getByTestId(`delete-provider-${provider.id}`)
    await deleteBtn.click()

    // Wait for update
    await expect
      .poll(async () => {
        const providers = await apiGet('/api/providers')
        return providers.find((p: { id: string }) => p.id === provider.id)
      })
      .toBeUndefined()

    // Verify both provider and model are gone
    const providers = await apiGet('/api/providers')
    expect(
      providers.find((p: { id: string }) => p.id === provider.id),
    ).toBeUndefined()

    const models = await apiGet('/api/models/all')
    expect(
      models.find((m: { id: string }) => m.id === model.id),
    ).toBeUndefined()

    // Don't cleanup — already deleted
    createdProviderId = undefined
    createdModelIds = []
  })

  test('default model selector in general settings', async ({ page }) => {
    // Setup: create provider + enabled model
    const provider = await apiPost('/api/providers', {
      name: 'E2E Default Model',
      type: 'openai_compatible',
      base_url: 'https://default-model.example.com',
      api_key: 'sk-default-test',
    })
    createdProviderId = provider.id

    const model = await apiPost('/api/models', {
      provider_id: provider.id,
      model_id: 'default-test-model',
      display_name: 'Default Test Model',
    })
    createdModelIds.push(model.id)

    // Enable the model
    await fetch(`${API_BASE}/api/models/${model.id}/toggle`, {
      method: 'PATCH',
    })

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('settings-trigger').click()
    await expect(page.getByTestId('settings-panel')).toBeVisible()

    // Switch to general settings tab
    await page.getByTestId('tab-general').click()
    await expect(page.getByTestId('general-settings')).toBeVisible()

    // Default model selector should be visible
    const selectTrigger = page.getByTestId('default-model-select')
    await expect(selectTrigger).toBeVisible()

    // Open selector and verify enabled model appears
    await selectTrigger.click()
    const option = page.getByText('Default Test Model')
    await expect(option).toBeVisible()

    // Select the model
    await option.click()

    // Wait for update
    await expect
      .poll(async () => {
        const settings = await apiGet('/api/settings')
        return settings.find(
          (s: { key: string }) => s.key === 'default_model_id',
        )
      })
      .toHaveProperty('value', model.id)

    // Verify setting was saved
    const settings = await apiGet('/api/settings')
    const defaultSetting = settings.find(
      (s: { key: string }) => s.key === 'default_model_id',
    )
    expect(defaultSetting).toBeDefined()
    expect(defaultSetting.value).toBe(model.id)
  })
})
