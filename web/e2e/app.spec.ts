import { expect, test } from '@playwright/test'

test('without a session the panel sends you to sign in and asks the server only a few times', async ({ page }) => {
  let asked = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/api/staff/session')) asked++
  })
  await page.goto('/panel/pedidos')
  await expect(page).toHaveURL(/\/ingreso$/)
  await page.waitForTimeout(1_000)
  expect(asked).toBeLessThan(5)
})

test('an unknown address shows its own page with a way back to the menu', async ({ page }) => {
  await page.goto('/no-existe')
  await expect(page.getByText('Esta página no existe.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Volver a la carta' })).toHaveAttribute('href', '/')
})
