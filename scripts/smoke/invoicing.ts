import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { client, signedIn } from './client.ts'

const base = process.argv[2] ?? 'http://localhost:8080'

const manager = await signedIn(base, 'Encargada', '123456')
const waiter = await signedIn(base, 'Mesero', '222222')
const kitchen = await signedIn(base, 'Cocina', '333333')
const customer = client(base)
await customer('GET', '/api/menu')
const sql = (statement: string) => execFileSync('psql', ['-qtAc', statement], { encoding: 'utf8' }).trim()

try {
  await manager('PUT', '/api/schedule/today', { opens_at: '00:00', closes_at: '23:59', lunch_starts_at: null, lunch_ends_at: null })
  await manager('POST', '/api/schedule/status', { status: 'open', wait_minutes: null, reason: null, until_at: null })
  const { date } = (await customer('GET', '/api/schedule')).body
  const coffee = (await customer('GET', '/api/menu')).body.categories.flatMap((c: { products: unknown[] }) => c.products)
    .find((p: { name: { es: string } }) => p.name.es === 'Taza de café')
  const line = { kind: 'product', product_variant_id: coffee.variants[0].id, option_item_ids: [], soup_dish_id: null, main_dish_id: null, quantity: 2, note: null }
  const order = (name: string, invoice: object | null) =>
    customer('POST', '/api/orders', { customer_name: name, customer_phone: '593999999999', delivery_address: null, note: null, lines: [line], invoice })

  const before = Number(sql('select count(*) from customer_order'))
  const badId = await order('Ana', { id_type: 'cedula', id_number: '123', name: 'Ana', email: 'ana@correo.ec', address: null })
  assert.equal(badId.body.code, 'invoicing.invalidId', 'a cedula must have 10 digits')
  assert.equal(Number(sql('select count(*) from customer_order')), before, 'a refused invoice leaves no half order behind')

  const invoiced = (await order('José Peñaranda', { id_type: 'cedula', id_number: '0102030405', name: 'Peñaranda, José "Pepe"', email: 'jose@correo.ec', address: 'Zaruma' })).body
  const requests = (await manager('GET', `/api/invoicing/requests/${date}`)).body
  const request = requests.find((candidate: { order_id: number }) => candidate.order_id === invoiced.id)
  assert.equal(request?.id_number, '0102030405', 'the manager sees the invoice details')

  const cancelled = (await order('Luis', null)).body
  assert.equal((await waiter('POST', `/api/orders/${cancelled.id}/cancel`, { reason: 'Se acabó' })).status, 403, 'a waiter cannot cancel orders')
  assert.equal((await manager('POST', `/api/orders/${cancelled.id}/cancel`, { reason: '' })).status, 400, 'a cancellation needs a reason')
  assert.equal((await manager('POST', `/api/orders/${cancelled.id}/cancel`, { reason: 'El cliente llamó para cancelar' })).status, 204, 'the manager cancels an order')
  const queue = (await kitchen('GET', '/api/orders/kitchen')).body
  assert.ok(!queue.some((ticket: { order_id: number }) => ticket.order_id === cancelled.id), 'a cancelled order leaves the kitchen')
  assert.equal((await customer('GET', `/api/orders/tracking/${cancelled.tracking_token}`)).body.state, 'cancelled', 'the customer sees it cancelled')
  assert.equal((await waiter('POST', `/api/orders/${cancelled.id}/close`, { payments: [{ method: 'cash', amount: 10 }] })).body.code, 'orders.notOpen', 'a cancelled order cannot be charged')

  assert.equal((await manager('PUT', `/api/invoicing/requests/${request.id}`, { invoice_number: '001-001-000000122' })).body.code, 'invoicing.notPaid', 'an invoice is recorded only once the order is paid')

  const transfer = invoiced.total
  assert.equal((await waiter('POST', `/api/orders/${invoiced.id}/close`, { payments: [{ method: 'transfer', amount: transfer }] })).status, 204, 'the invoiced order is paid by transfer')
  const payments = (await manager('GET', `/api/orders/payments/${date}`)).body
  const payment = payments.find((candidate: { order_id: number }) => candidate.order_id === invoiced.id)
  assert.equal(payment.verified, false, 'the transfer waits to be checked in the bank')
  assert.equal((await manager('PUT', `/api/orders/payments/${payment.id}/verified`)).status, 204, 'the manager confirms the transfer arrived')
  assert.equal((await manager('GET', `/api/orders/payments/${date}`)).body.find((candidate: { id: number }) => candidate.id === payment.id).verified, true, 'the transfer shows as confirmed')

  assert.equal((await manager('PUT', `/api/invoicing/requests/${request.id}`, { invoice_number: '001-001-000000123' })).status, 204, 'the manager records the invoice number')

  const sales = (await manager('GET', `/api/invoicing/sales?from=${date}&to=${date}`)).body
  assert.deepEqual(sales.map((sale: { order_id: number }) => sale.order_id), [invoiced.id], 'only the paid order counts as a sale, the cancelled one does not')

  const response = await fetch(`${base}/api/invoicing/sales.csv?from=${date}&to=${date}`, { headers: { cookie: '' } })
  assert.equal(response.status, 401, 'the sales file needs a session')
  const csv = await manager('GET', `/api/invoicing/sales.csv?from=${date}&to=${date}`)
  const text: string = csv.body
  assert.equal(text.charCodeAt(0), 0xfeff, 'the file starts with the UTF-8 mark so Excel reads the accents')
  const rows = text.slice(1).split('\r\n')
  assert.match(rows[0], /^Fecha,Hora,Pedido,Cliente,/, 'the header is in Spanish')
  assert.ok(rows[1].includes('José Peñaranda'), 'accents arrive intact')
  assert.ok(rows[1].includes('"Peñaranda, José ""Pepe"""'), 'names with commas and quotes are quoted')
  assert.ok(rows[1].includes('001-001-000000123'), 'the invoice number is in the file')
  assert.match(rows[2], /^Totales,/, 'the file ends with the totals')
} finally {
  execFileSync('psql', ['-q', '-f', fileURLToPath(new URL('../dev-seed/seed.sql', import.meta.url))], { stdio: 'ignore' })
}

process.stdout.write(`smoke ok: cash and invoicing at ${base}\n`)
