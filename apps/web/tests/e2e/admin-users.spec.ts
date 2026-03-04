import { expect, test } from '@playwright/test'

test('admin can open Users view and create user in GUI', async ({ page }) => {
  let users = [
    { id: 'admin-1', email: 'admin@example.com', role: 'admin', active: true },
  ]

  async function fulfillJson(route: any, body: unknown, methods = 'GET,POST,PATCH,DELETE,OPTIONS') {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': methods, 'access-control-allow-headers': '*' } })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  }

  await page.route('**://api.test/v1/auth/login', async route => fulfillJson(route, { access_token: 'admin-token', token_type: 'bearer' }, 'POST,OPTIONS'))
  await page.route('**://api.test/v1/auth/me', async route => fulfillJson(route, { id: 'admin-1', email: 'admin@example.com', role: 'admin' }))
  await page.route('**://api.test/v1/auth/assigned-athletes', async route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))
  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async route => fulfillJson(route, []))

  await page.route('**://api.test/v1/admin/users/**', async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    if (method === 'GET' || method === 'OPTIONS') {
      await fulfillJson(route, users)
      return
    }
    if (method === 'POST' && url.pathname.endsWith('/users/')) {
      const payload = JSON.parse(route.request().postData() || '{}')
      const created = { id: `u-${users.length + 1}`, email: payload.email, role: payload.role, active: payload.active ?? true }
      users = [...users, created]
      await fulfillJson(route, created)
      return
    }
    if (method === 'PATCH') {
      const id = url.pathname.split('/').pop()!
      const payload = JSON.parse(route.request().postData() || '{}')
      users = users.map((u) => (u.id === id ? { ...u, ...payload } : u))
      const updated = users.find((u) => u.id === id)
      await fulfillJson(route, updated)
      return
    }
    if (method === 'POST' && url.pathname.endsWith('/password')) {
      await fulfillJson(route, { ok: true })
      return
    }
    await fulfillJson(route, { ok: true })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()

  await page.getByRole('link', { name: 'Users' }).click()
  await expect(page.getByRole('heading', { name: 'Admin · Users' })).toBeVisible()

  const createRow = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Admin · Users' }) })
  await createRow.getByPlaceholder('Email').fill('coach@example.com')
  await createRow.locator('select').first().selectOption('trainer')
  await createRow.getByPlaceholder('Password').fill('secret1234')
  await page.getByRole('button', { name: 'Create user' }).click()

  await expect(page.getByText('coach@example.com · trainer · active')).toBeVisible()

  await page.getByLabel('Role for coach@example.com').selectOption('athlete')
  await expect(page.getByText('coach@example.com · athlete · active')).toBeVisible()

  const row = page.locator('li', { hasText: 'coach@example.com' })
  await row.getByRole('button', { name: 'Reset Password' }).click()
  await page.getByPlaceholder('New password (min 8 chars)').fill('updated1234')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Reset password' })).toHaveCount(0)
})
