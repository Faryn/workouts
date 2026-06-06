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

test('active workout prefills pending sets with planned values', async ({ page }) => {
  const session = {
    id: 'session-1',
    athlete_id: 'athlete-1',
    scheduled_workout_id: 'scheduled-1',
    status: 'in_progress',
    notes: null,
    started_at: '2026-06-06T18:00:00Z',
    ended_at: null,
    duration_seconds: null,
    last_saved_at: null,
    updated_at: '2026-06-06T18:00:00Z',
    version: 2,
    logged_exercises: [
      {
        id: 'logged-exercise-1',
        exercise_id: 'exercise-1',
        sort_order: 1,
        sets: [
          {
            id: 'set-1',
            set_number: 1,
            planned_weight: 20,
            planned_reps: 8,
            actual_weight: 20,
            actual_reps: 7,
            status: 'done',
          },
          {
            id: 'set-2',
            set_number: 2,
            planned_weight: 20,
            planned_reps: 8,
            actual_weight: null,
            actual_reps: null,
            status: 'pending',
          },
          {
            id: 'set-3',
            set_number: 3,
            planned_weight: 20,
            planned_reps: 8,
            actual_weight: null,
            actual_reps: null,
            status: 'pending',
          },
        ],
      },
    ],
  }

  await page.route('**://api.test/v1/auth/me**', route => fulfillJson(route, { id: 'athlete-1', email: 'athlete@example.com', role: 'athlete' }))
  await page.route('**://api.test/v1/auth/assigned-athletes**', route => fulfillJson(route, [{ id: 'athlete-1', email: 'athlete@example.com' }]))
  await page.route('**://api.test/v1/sessions/in-progress**', route => fulfillJson(route, session))
  await page.route('**://api.test/v1/sessions/?**', route => fulfillJson(route, []))
  await page.route('**://api.test/v1/templates/**', route => fulfillJson(route, []))
  await page.route('**://api.test/v1/scheduled-workouts/?**', route => fulfillJson(route, []))
  await page.route('**://api.test/v1/exercises/**', route => fulfillJson(route, [
    { id: 'exercise-1', name: 'Dumbbell Press', type: 'strength', owner_scope: 'global' },
  ]))

  await page.goto('/')
  await page.evaluate(() => sessionStorage.setItem('auth-session', '1'))
  await page.goto('/sessions')

  await expect(page.getByText('Set 2 of 3')).toBeVisible()
  await expect(page.getByLabel('Weight')).toHaveValue('20')
  await expect(page.getByLabel('Repetitions')).toHaveValue('8')

  const completedSet = page.getByRole('button', { name: /Set 1/ })
  await expect(completedSet).toContainText('Logged: 20 kg × 7 reps')

  await page.getByRole('button', { name: /Set 3/ }).click()
  await expect(page.getByLabel('Weight')).toHaveValue('20')
  await expect(page.getByLabel('Repetitions')).toHaveValue('8')
})
