import { expect, test } from '@playwright/test'

async function fulfillJson(route: any, body: unknown, methods = 'GET,POST,OPTIONS') {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': methods,
        'access-control-allow-headers': '*',
      },
    })
    return
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })
}

test('today priority starts the clicked scheduled workout instead of stale selection', async ({ page }) => {
  const today = new Date().toLocaleDateString('en-CA')
  let startedScheduledId: string | null = null

  await page.route('**://api.test/v1/auth/me**', route => fulfillJson(route, {
    id: 'athlete-1',
    email: 'athlete@example.com',
    role: 'athlete',
  }))
  await page.route('**://api.test/v1/auth/assigned-athletes**', route => fulfillJson(route, [
    { id: 'athlete-1', email: 'athlete@example.com' },
  ]))
  await page.route('**://api.test/v1/sessions/start', async route => {
    startedScheduledId = (await route.request().postDataJSON()).scheduled_workout_id
    await fulfillJson(route, {
      id: 'session-1',
      athlete_id: 'athlete-1',
      scheduled_workout_id: startedScheduledId,
      status: 'in_progress',
      version: 1,
      logged_exercises: [],
    })
  })
  await page.route('**://api.test/v1/sessions/in-progress**', route => fulfillJson(route, null))
  await page.route('**://api.test/v1/sessions/?**', route => fulfillJson(route, []))
  await page.route('**://api.test/v1/templates/**', route => fulfillJson(route, [
    { id: 'template-old', name: 'February program', exercises: [] },
    { id: 'template-today', name: 'May program', exercises: [] },
  ]))
  await page.route('**://api.test/v1/scheduled-workouts/?**', route => fulfillJson(route, [
    { id: 'scheduled-old', athlete_id: 'athlete-1', template_id: 'template-old', date: '2026-03-19', status: 'planned' },
    { id: 'scheduled-today', athlete_id: 'athlete-1', template_id: 'template-today', date: today, status: 'planned' },
  ]))
  await page.route('**://api.test/v1/exercises/**', route => fulfillJson(route, []))

  await page.goto('/')
  await page.evaluate(() => sessionStorage.setItem('auth-session', '1'))
  await page.goto('/sessions?scheduled_id=scheduled-today')

  await page.getByRole('button', { name: 'Start today’s workout' }).click()

  await expect.poll(() => startedScheduledId).toBe('scheduled-today')
})
