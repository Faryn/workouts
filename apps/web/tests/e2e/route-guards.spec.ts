import { expect, test } from '@playwright/test'

async function wireCommon(page: any, me: { id: string; email: string; role: string }) {
  async function fulfillJson(route: any, body: unknown, methods = 'GET,POST,PATCH,DELETE,OPTIONS') {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': methods, 'access-control-allow-headers': '*' } })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  }

  await page.route('**://api.test/v1/auth/login', async route => fulfillJson(route, { access_token: 't', token_type: 'bearer' }, 'POST,OPTIONS'))
  await page.route('**://api.test/v1/auth/me', async route => fulfillJson(route, me))
  await page.route('**://api.test/v1/auth/assigned-athletes', async route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))
  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/templates/**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/exercises/**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/scheduled-workouts/?**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/sessions/**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/admin/users/**', async route => fulfillJson(route, []))
}

test('admin only sees users surface, not workout nav', async ({ page }) => {
  await wireCommon(page, { id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Week' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Plans' })).toHaveCount(0)
})

test('trainer opening admin route cannot access users admin surface', async ({ page }) => {
  await wireCommon(page, { id: 'trainer-1', email: 'trainer@example.com', role: 'trainer' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Admin · Users' })).toHaveCount(0)
})
