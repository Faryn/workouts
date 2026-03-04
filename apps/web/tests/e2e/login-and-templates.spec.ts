import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**://api.test/v1/auth/login', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ access_token: 'fake-token', token_type: 'bearer' }),
    })
  })

  await page.route('**://api.test/v1/auth/me', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ id: 'athlete-1', email: 'athlete@example.com', role: 'athlete' }),
    })
  })

  await page.route('**://api.test/v1/auth/assigned-athletes', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([{ id: 'athlete-1', email: 'athlete@example.com' }]),
    })
  })

  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([]),
    })
  })

  await page.route('**://api.test/v1/exercises/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([{ id: 'ex-1', name: 'Bench Press', type: 'strength', owner_scope: 'global' }]),
    })
  })
})

test('login renders dashboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('athlete@example.com')).toBeVisible()
})

test('template create and delete flow in UI', async ({ page }) => {
  let templates = [{ id: 't1', name: 'Upper A', notes: 'push', owner_id: 'athlete-1', exercises: [] as any[] }]

  await page.route('**://api.test/v1/templates**', async (route) => {
    const method = route.request().method()

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
          'access-control-allow-headers': '*',
        },
      })
      return
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(templates),
      })
      return
    }

    if (method === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}')
      const created = { id: `t${templates.length + 1}`, name: payload.name, notes: payload.notes || null, owner_id: 'athlete-1', exercises: [] }
      templates = [...templates, created]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(created),
      })
      return
    }

    if (method === 'DELETE') {
      const url = new URL(route.request().url())
      const id = url.pathname.split('/').pop()
      templates = templates.filter((t) => t.id !== id)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ ok: true }),
      })
      return
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: 'method_not_allowed' }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.getByRole('link', { name: 'Plans' }).click()

  await expect(page.getByText('Upper A')).toBeVisible()

  await page.getByPlaceholder('Template name').fill('Lower B')
  await page.getByPlaceholder('Notes').fill('legs')
  await page.getByRole('button', { name: 'Create' }).click()

  await expect(page.getByText('Lower B')).toBeVisible()

  const lowerRow = page.locator('li', { hasText: 'Lower B' })
  await lowerRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Lower B')).toHaveCount(0)
})
