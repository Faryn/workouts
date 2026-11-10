import { expect, test } from '@playwright/test'

test('follows system theme changes without a reload', async ({ page }) => {
  await page.route('**://api.test/v1/**', route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ detail: 'Not authenticated' }),
  }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()

  for (const scheme of ['light', 'dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect(page.locator('html')).toHaveCSS('color-scheme', scheme)
    await expect(page.locator('body')).toHaveCSS('background-color', scheme === 'dark' ? 'rgb(24, 28, 26)' : 'rgb(246, 245, 241)')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', scheme === 'dark' ? '#181c1a' : '#f6f5f1')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  }
})
