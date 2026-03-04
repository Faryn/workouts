import { expect, test } from '@playwright/test'

test('trainer happy path: dashboard export + schedule screen loads', async ({ page }) => {
  async function fulfillJson(route: any, body: unknown, methods = 'GET,POST,PATCH,DELETE,OPTIONS') {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': methods, 'access-control-allow-headers': '*' } })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  }

  await page.route('**://api.test/v1/auth/login', async route => fulfillJson(route, { access_token: 'fake-token', token_type: 'bearer' }, 'POST,OPTIONS'))
  await page.route('**://api.test/v1/auth/me', async route => fulfillJson(route, { id: 'trainer-1', email: 'trainer@example.com', role: 'trainer' }))
  await page.route('**://api.test/v1/auth/assigned-athletes', async route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))

  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async route => fulfillJson(route, [
    { kind: 'strength', id: 'sw-1', date: '2026-03-10', status: 'planned', template_id: 'tpl-1', template_name: 'Upper A' },
  ]))
  await page.route('**://api.test/v1/templates/**', async route => fulfillJson(route, [
    { id: 'tpl-1', name: 'Upper A', notes: null, owner_id: 'trainer-1', exercises: [] },
  ]))
  await page.route('**://api.test/v1/exercises/**', async route => fulfillJson(route, [
    { id: 'ex-1', name: 'Bench Press', type: 'strength', owner_scope: 'global' },
  ]))
  await page.route('**://api.test/v1/scheduled-workouts/?**', async route => fulfillJson(route, [
    { id: 'sw-1', athlete_id: 'athlete-1', template_id: 'tpl-1', date: '2026-03-10', status: 'planned', source: 'trainer', notes: null },
  ]))

  await page.route('**://api.test/v1/exports/sessions.csv**', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': '*' } })
      return
    }
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/csv' }, body: 'session_id\nws-1\n' })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('trainer@example.com')).toBeVisible()
  await expect(page.locator('select')).toBeVisible() // athlete selector for trainer

  await page.getByRole('button', { name: 'Export Sessions CSV' }).click()
  await expect(page.getByText('Upcoming Calendar (14 days)')).toBeVisible()

  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: 'Schedule', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add once' })).toBeVisible()
})
