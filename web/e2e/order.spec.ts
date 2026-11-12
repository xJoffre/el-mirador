import { expect, request, test, type APIRequestContext } from '@playwright/test'

async function signIn(api: APIRequestContext, name: string, pin: string) {
  const members: { id: number; name: string }[] = await (await api.get('/api/staff/members')).json()
  const token = (await api.storageState()).cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')!.value
  const headers = { 'X-XSRF-TOKEN': token }
  await api.post('/api/staff/session', { data: { staff_id: members.find((member) => member.name === name)!.id, pin }, headers })
  return headers
}

test.beforeEach(async ({ baseURL }) => {
  const api = await request.newContext({ baseURL })
  const headers = await signIn(api, 'Encargada', '123456')
  await api.put('/api/schedule/today', { data: { opens_at: '00:00', closes_at: '23:59', lunch_starts_at: null, lunch_ends_at: null }, headers })
  await api.post('/api/schedule/status', { data: { status: 'open', wait_minutes: null, reason: null, until_at: null }, headers })
  await api.dispose()
})

test('a customer orders on the web, the kitchen marks it ready and the tracking page updates by itself', async ({ page, browser }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /bebidas sin alcohol/i }).click()
  await page.getByRole('button', { name: 'Agregar Taza de café' }).click()
  await page.getByRole('main').getByRole('button', { name: 'Agregar otro Taza de café' }).click()
  await page.getByRole('button', { name: 'Enviar pedido' }).click()

  await page.getByLabel('Tu nombre').fill('Cliente E2E')
  await page.getByLabel('Tu WhatsApp').fill('593999999999')
  await page.getByRole('button', { name: /^Enviar pedido · / }).click()

  await expect(page).toHaveURL(/\/pedido\//)
  await expect(page.getByRole('status')).toHaveText(/ya lo tenemos/i)
  const number = (await page.getByRole('heading', { level: 1 }).textContent())!.replace(/\D/g, '')

  const kitchen = await browser.newPage()
  await kitchen.goto('/ingreso')
  await kitchen.getByRole('button', { name: 'Cocina' }).click()
  for (const digit of '333333') await kitchen.getByRole('button', { name: digit, exact: true }).click()
  await expect(kitchen).toHaveURL(/\/panel\/cocina/)
  const ticket = kitchen.getByRole('article').filter({ hasText: `#${number}` })
  await expect(ticket).toContainText('2 × Taza de café')
  await ticket.getByRole('button', { name: 'Listo' }).click()
  await expect(ticket).toHaveCount(0)

  await expect(page.getByRole('status')).toHaveText(/está listo/i)
})
