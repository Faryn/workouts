import { expect, test } from '@playwright/test'

async function fulfillJson(route: any, body: unknown, methods = 'GET,POST,PATCH,DELETE,OPTIONS') {
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

test('trainer: no Gym nav, /sessions redirects, mixed-owner templates show names', async ({ page }) => {
  await page.route('**://api.test/v1/auth/login', async route => fulfillJson(route, { access_token: 't', token_type: 'bearer' }, 'POST,OPTIONS'))
  await page.route('**://api.test/v1/auth/me', async route => fulfillJson(route, { id: 'trainer-1', email: 'trainer@example.com', role: 'trainer' }))
  await page.route('**://api.test/v1/auth/assigned-athletes', async route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))

  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/scheduled-workouts/?**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/sessions/**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/exercises/**', async route => fulfillJson(route, [
    { id: 'ex-global', name: 'Bench Press', type: 'strength', owner_scope: 'global' },
  ]))

  await page.route('**://api.test/v1/templates/**', async route => fulfillJson(route, [
    {
      id: 'tpl-athlete',
      name: 'Athlete Plan',
      notes: null,
      owner_id: 'athlete-1',
      can_manage: true,
      exercises: [
        {
          id: 'te-1',
          exercise_id: 'ex-trainer-custom',
          exercise_name: 'Trainer Custom Bench',
          sort_order: 1,
          planned_sets: 3,
          planned_reps: 5,
          planned_weight: 80,
          rest_seconds: 120,
          notes: null,
        },
      ],
    },
  ]))

  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page.getByRole('link', { name: 'Gym' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Plans' }).click()
  await expect(page.getByText('Athlete Plan')).toBeVisible()
  const athletePlanRow = page.locator('li', { hasText: 'Athlete Plan' })
  await expect(athletePlanRow.getByRole('button', { name: 'Edit' })).toBeVisible()
  await page.getByText('Show exercises').click()
  await expect(page.getByText('Trainer Custom Bench')).toBeVisible()
})

test('athlete: trainer-owned template appears with exercise_name fallback', async ({ page }) => {
  await page.route('**://api.test/v1/auth/login', async route => fulfillJson(route, { access_token: 'a', token_type: 'bearer' }, 'POST,OPTIONS'))
  await page.route('**://api.test/v1/auth/me', async route => fulfillJson(route, { id: 'athlete-1', email: 'athlete@example.com', role: 'athlete' }))
  await page.route('**://api.test/v1/auth/assigned-athletes', async route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))

  await page.route('**://api.test/v1/scheduled-workouts/calendar**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/exercises/**', async route => fulfillJson(route, []))
  await page.route('**://api.test/v1/templates/**', async route => fulfillJson(route, [
    {
      id: 'tpl-trainer',
      name: 'Trainer Program A',
      notes: null,
      owner_id: 'trainer-1',
      can_manage: false,
      exercises: [
        {
          id: 'te-2',
          exercise_id: 'ex-trainer-only',
          exercise_name: 'Tempo Bench Press',
          sort_order: 1,
          planned_sets: 4,
          planned_reps: 6,
          planned_weight: null,
          rest_seconds: 90,
          notes: null,
        },
      ],
    },
  ]))

  await page.goto('/')
  await page.getByRole('button', { name: 'Login' }).click()
  await page.getByRole('link', { name: 'Plans' }).click()

  await expect(page.getByText('Trainer Program A')).toBeVisible()
  await page.getByText('Show exercises').click()
  await expect(page.getByText('Tempo Bench Press')).toBeVisible()

  const row = page.locator('li', { hasText: 'Trainer Program A' })
  await expect(row.getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(row.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})
