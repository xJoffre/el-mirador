import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { client, signIn } from './client.ts'
import { GetMenuResponse, GetScheduleResponse, GetTrackingResponse, PlaceOrderResponse } from '../../web/src/shared/api/schemas.ts'

const base = process.argv[2] ?? 'http://localhost:8080'

const sql = (statement: string) => execFileSync('psql', ['-qtAc', statement], { encoding: 'utf8' }).trim()
const staff = async (name: string, pin: string) => {
  const call = client(base)
  await signIn(call, name, pin)
  return call
}
const manager = await staff('Encargada', '123456')
const kitchen = await staff('Cocina', '333333')
const waiter = await staff('Mesero', '222222')
const customer = client(base)
await customer('GET', '/api/menu')

try {
  await manager('PUT', '/api/schedule/today', { opens_at: '00:00', closes_at: '23:59', lunch_starts_at: '00:00', lunch_ends_at: '23:59' })
  await manager('POST', '/api/schedule/status', { status: 'open', wait_minutes: null, reason: null, until_at: null })
  const menu = GetMenuResponse.parse((await customer('GET', '/api/menu')).body)
  const products = menu.categories.flatMap((category) => category.products)
  const simple = products.find((product) => !product.sold_out && !product.dine_in_only && product.option_groups.length === 0)!
  const wings = products.find((product) => product.name.es === 'Alitas')!
  const wine = products.find((product) => product.dine_in_only)!
  const soup = menu.lunch.find((dish) => dish.kind === 'soup')!
  const main = menu.lunch.find((dish) => dish.kind === 'main' && !dish.sold_out)!

  const order = {
    customer_name: 'Cliente de prueba',
    customer_phone: '593999999999',
    delivery_address: 'Calle Sucre y Colón, casa azul',
    note: null,
    lines: [
      { kind: 'product', product_variant_id: simple.variants[0].id, option_item_ids: [], soup_dish_id: null, main_dish_id: null, quantity: 2, note: null, unit_price: 0.01 },
      { kind: 'product', product_variant_id: wings.variants[0].id, option_item_ids: [wings.option_groups[0].items[0].id], soup_dish_id: null, main_dish_id: null, quantity: 1, note: 'bien cocidas' },
      { kind: 'lunch_full', product_variant_id: null, option_item_ids: null, soup_dish_id: soup.id, main_dish_id: main.id, quantity: 1, note: null },
    ],
    total: 0.01,
  }
  const placed = await customer('POST', '/api/orders', order)
  assert.equal(placed.status, 200, `the customer places the order ${JSON.stringify(placed.body)}`)
  const { id, tracking_token: token, total } = PlaceOrderResponse.parse(placed.body)
  const expected = simple.variants[0].price * 2 + wings.variants[0].price + main.price_full!
  assert.equal(total, Math.round(expected * 100) / 100, 'the prices sent by the customer are ignored: the database sets them')
  assert.equal(Number(sql(`select total from customer_order where id = ${id}`)), total, 'the total is kept by the database')
  assert.equal(token.length >= 20, true, 'the tracking link uses a long random code')

  assert.equal((await customer('GET', '/api/orders/tracking/not-a-token')).status, 404, 'a wrong tracking code finds nothing')
  const tracking = async () => GetTrackingResponse.parse((await customer('GET', `/api/orders/tracking/${token}`)).body)
  assert.equal((await tracking()).state, 'received', 'the customer sees the order received')
  assert.equal((await tracking()).lines.length, 3, 'with its three lines')

  const wineOrder = await customer('POST', '/api/orders', { ...order, lines: [{ ...order.lines[0], product_variant_id: wine.variants[0].id }] })
  assert.equal(wineOrder.body.code, 'orders.dineInOnly', 'drinks sold only at the store cannot be ordered')
  const noSauce = await customer('POST', '/api/orders', { ...order, lines: [{ ...order.lines[1], option_item_ids: [] }] })
  assert.equal(noSauce.body.code, 'orders.missingChoice', 'a required choice must be made')

  const tickets: { round_id: number; order_id: number }[] = (await kitchen('GET', '/api/orders/kitchen')).body
  const ticket = tickets.find((candidate) => candidate.order_id === id)
  assert.ok(ticket, 'the order reaches the kitchen queue')
  assert.equal((await waiter('GET', '/api/orders/kitchen')).status, 403, 'a waiter does not see the kitchen queue')
  assert.equal((await kitchen('PUT', `/api/orders/rounds/${ticket.round_id}/start`)).status, 204, 'the kitchen starts it')
  assert.equal((await tracking()).state, 'preparing', 'the customer sees it being prepared')
  assert.equal((await kitchen('PUT', `/api/orders/rounds/${ticket.round_id}/ready`)).status, 204, 'the kitchen marks it ready')
  assert.equal((await tracking()).state, 'ready', 'the customer sees it ready')
  assert.ok(!(await kitchen('GET', '/api/orders/kitchen')).body.some((candidate: { order_id: number }) => candidate.order_id === id), 'a ready order leaves the kitchen queue')

  const short = await waiter('POST', `/api/orders/${id}/close`, { payments: [{ method: 'cash', amount: total - 1 }] })
  assert.equal(short.body.code, 'orders.paymentShort', 'an order is not closed without full payment')
  const closed = await waiter('POST', `/api/orders/${id}/close`, { payments: [{ method: 'cash', amount: 5 }, { method: 'transfer', amount: Math.round((total - 5) * 100) / 100 }] })
  assert.equal(closed.status, 204, 'the waiter charges and hands it over, split in cash and transfer')
  assert.equal((await tracking()).state, 'delivered', 'the customer sees it delivered')
  const again = await waiter('POST', `/api/orders/${id}/close`, { payments: [{ method: 'cash', amount: 1 }] })
  assert.equal(again.body.code, 'orders.notOpen', 'a closed order cannot be charged again')

  const today: { id: number }[] = (await waiter('GET', '/api/orders/today')).body
  assert.ok(today.some((candidate) => candidate.id === id), 'the order is in the list of today')
  GetScheduleResponse.parse((await customer('GET', '/api/schedule')).body)
} finally {
  execFileSync('psql', ['-q', '-f', fileURLToPath(new URL('../dev-seed/seed.sql', import.meta.url))], { stdio: 'ignore' })
}

process.stdout.write(`smoke ok: orders at ${base}\n`)
