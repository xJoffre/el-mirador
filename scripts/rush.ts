import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import { client, signedIn } from './smoke/client.ts'
import { GetMenuResponse, GetScheduleResponse } from '../web/src/shared/api/schemas.ts'

const [base = 'http://localhost:8080', count = '30', minutes = '15', mode = 'robot-kitchen'] = process.argv.slice(2)
const orders = Number(count)
const window = Number(minutes) * 60_000
const pace = window / (15 * 60_000)
const robots = mode === 'robot-kitchen'
const random = (from: number, to: number) => from + Math.random() * (to - from)

const visitor = client(base)
if (robots) {
  const manager = await signedIn(base, 'Encargada', '123456')
  await manager('PUT', '/api/schedule/today', { opens_at: '00:00', closes_at: '23:59', lunch_starts_at: null, lunch_ends_at: null })
  await manager('POST', '/api/schedule/status', { status: 'open', wait_minutes: null, reason: null, until_at: null })
}
const schedule = GetScheduleResponse.parse((await visitor('GET', '/api/schedule')).body)
assert.notEqual(schedule.status.status, 'closed', 'open the store before the rush')
const menu = GetMenuResponse.parse((await visitor('GET', '/api/menu')).body)
const dishes = menu.categories
  .flatMap((category) => category.products)
  .filter((product) => !product.sold_out && !product.dine_in_only)
  .filter((product) => product.option_groups.every((group) => group.items.filter((item) => !item.sold_out).length >= group.min_choices))
  .map((product) => ({
    product_variant_id: product.variants[0].id,
    option_item_ids: product.option_groups.flatMap((group) => group.items.filter((item) => !item.sold_out).slice(0, group.min_choices).map((item) => item.id)),
  }))

const latencies: number[] = []
const failures: string[] = []
const placed = new Map<number, number>()
const streams = new AbortController()
let notices = 0

async function listen() {
  const response = await fetch(`${base}/api/events`, { signal: streams.signal })
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      notices += (decoder.decode(value).match(/^event:/gm) ?? []).length
    }
  } catch {
    return
  }
}

async function customer(index: number) {
  await sleep(index * (window / orders) + random(0, window / orders))
  try {
    await order(index)
  } catch (error) {
    failures.push(`order ${index + 1}: ${String(error)}`)
  }
}

async function order(index: number) {
  const shopper = client(base)
  await shopper('GET', '/api/menu')
  const lines = Array.from({ length: Math.ceil(random(0, 3)) }, () => ({
    kind: 'product',
    ...dishes[Math.floor(random(0, dishes.length))],
    soup_dish_id: null,
    main_dish_id: null,
    quantity: Math.ceil(random(0, 3)),
    note: null,
  }))
  const started = performance.now()
  const response = await shopper('POST', '/api/orders', {
    customer_name: `Simulacro ${index + 1}`,
    customer_phone: `5939${String(Math.floor(random(0, 1e8))).padStart(8, '0')}`,
    delivery_address: index % 3 === 0 ? 'Simulacro, calle de prueba' : null,
    note: null,
    invoice: null,
    lines,
  })
  latencies.push(performance.now() - started)
  if (response.status !== 200) {
    failures.push(`order ${index + 1}: ${response.status} ${JSON.stringify(response.body)}`)
    return
  }
  placed.set(response.body.id, response.body.total)
  void listen()
}

async function kitchenAndCash() {
  const kitchen = await signedIn(base, 'Cocina', '333333')
  const waiter = await signedIn(base, 'Mesero', '222222')
  const handled = new Set<number>()
  const closed = new Set<number>()
  const deadline = Date.now() + window + 15 * 60_000 * pace + 60_000
  while ((closed.size < orders - failures.length || placed.size + failures.length < orders) && Date.now() < deadline) {
    const tickets: { round_id: number; order_id: number }[] = await kitchen('GET', '/api/orders/kitchen')
      .then((response) => response.body)
      .catch(() => [])
    for (const ticket of tickets.filter((candidate) => placed.has(candidate.order_id) && !handled.has(candidate.round_id))) {
      handled.add(ticket.round_id)
      void (async () => {
        await sleep(random(10_000, 60_000) * pace)
        try {
          await kitchen('PUT', `/api/orders/rounds/${ticket.round_id}/start`)
          await sleep(random(120_000, 600_000) * pace)
          await kitchen('PUT', `/api/orders/rounds/${ticket.round_id}/ready`)
          const paid = await waiter('POST', `/api/orders/${ticket.order_id}/close`, { payments: [{ method: 'cash', amount: placed.get(ticket.order_id) }] })
          if (paid.status === 204) closed.add(ticket.order_id)
          else failures.push(`close ${ticket.order_id}: ${paid.status} ${JSON.stringify(paid.body)}`)
        } catch (error) {
          failures.push(`kitchen ${ticket.order_id}: ${String(error)}`)
        }
      })()
    }
    await sleep(Math.max(1_000, 5_000 * pace))
  }
  return closed.size
}

const percentile = (values: number[], share: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * share))]

const started = Date.now()
const [, closed] = await Promise.all([Promise.all(Array.from({ length: orders }, (_, index) => customer(index))), robots ? kitchenAndCash() : Promise.resolve(0)])
streams.abort()
const health = await visitor('GET', '/actuator/health')

process.stdout.write(
  [
    `rush: ${placed.size}/${orders} orders placed in ${Math.round((Date.now() - started) / 1000)} s`,
    `order latency: p50 ${Math.round(percentile(latencies, 0.5))} ms, p95 ${Math.round(percentile(latencies, 0.95))} ms, max ${Math.round(Math.max(...latencies))} ms`,
    robots ? `kitchen and cash: ${closed}/${placed.size} cooked and charged` : 'kitchen and cash: left to the staff',
    `live notices received by the tracking pages: ${notices}`,
    `health: ${health.body.status}`,
    ...failures.map((failure) => `failure: ${failure}`),
    '',
  ].join('\n'),
)

assert.equal(failures.length, 0, 'every order goes through')
assert.equal(placed.size, orders, 'every customer could order')
if (robots) assert.equal(closed, orders, 'every order was cooked and charged')
assert.ok(percentile(latencies, 0.95) < 1_000, 'placing an order takes under a second for almost everyone')
assert.ok(notices > 0, 'the tracking pages receive live notices')
assert.equal(health.body.status, 'UP', 'the system is still up')
