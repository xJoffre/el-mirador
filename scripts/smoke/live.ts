import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { client, signIn } from './client.ts'
import { GetMenuResponse, GetScheduleResponse } from '../../web/src/shared/api/schemas.ts'

const base = process.argv[2] ?? 'http://localhost:8080'

const call = client(base)

const stream = await fetch(`${base}/api/events`)
const reader = stream.body!.pipeThrough(new TextDecoderStream()).getReader()
const nextEvent = async () => {
  const timeout = setTimeout(() => reader.cancel(), 5000)
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error('no event within 5 seconds')
    const event = value.match(/^event:(.+)$/m)?.[1].trim()
    if (event) {
      clearTimeout(timeout)
      return event
    }
  }
}
const menu = async () => GetMenuResponse.parse(await (await fetch(`${base}/api/menu`)).json())
const schedule = async () => GetScheduleResponse.parse(await (await fetch(`${base}/api/schedule`)).json())

try {
  await signIn(call, 'Encargada', '123456')
  const { date } = await schedule()
  const dishes: { id: number; kind: string }[] = (await call('GET', '/api/menu/lunch-dishes')).body

  const soup = dishes.find((dish) => dish.kind === 'soup')!
  const main = dishes.find((dish) => dish.kind === 'main')!
  assert.equal((await call('PUT', `/api/menu/lunch/${date}`, {
    includes: { es: 'Limonada y flan' },
    dishes: [{ lunch_dish_id: soup.id, price_full: null, price_alone: 1.25 }, { lunch_dish_id: main.id, price_full: 3.25, price_alone: 2.75 }],
  })).status, 204, 'the manager publishes the lunch')
  assert.equal(await nextEvent(), 'menu', 'publishing the lunch is announced at once')
  const published = await menu()
  assert.deepEqual(published.lunch.map((dish) => dish.id), [soup.id, main.id], 'the website gets the new lunch')
  assert.equal(published.lunch_includes?.es, 'Limonada y flan', 'with what it includes')

  assert.equal((await call('PUT', `/api/menu/lunch/${date}/dishes/${main.id}/sold-out`, { sold_out: true })).status, 204, 'a lunch dish is marked sold out')
  assert.equal(await nextEvent(), 'menu', 'the sold-out dish is announced at once')
  assert.equal((await menu()).lunch.find((dish) => dish.id === main.id)?.sold_out, true, 'the website shows it sold out')

  assert.equal((await call('PUT', '/api/menu/products/1/sold-out', { sold_out: true })).status, 204, 'a dish of the menu is marked sold out')
  assert.equal(await nextEvent(), 'menu', 'that is announced too')

  assert.equal((await call('POST', '/api/schedule/status', { status: 'delayed', wait_minutes: 45, reason: 'Mucha gente', until_at: null })).status, 204, 'the manager sets a delay')
  assert.equal(await nextEvent(), 'schedule', 'the delay is announced at once')
  const delayed = await schedule()
  assert.equal(delayed.status.wait_minutes, delayed.status.status === 'delayed' ? 45 : null, 'the website shows the wait when the store is open')

  assert.equal((await call('PUT', '/api/schedule/today', { opens_at: '00:00', closes_at: '00:01', lunch_starts_at: null, lunch_ends_at: null })).status, 204, 'the manager closes early today')
  assert.equal(await nextEvent(), 'schedule', 'the change of hours is announced')
  assert.equal((await schedule()).today.closes_at, '00:01:00', 'the website gets the hours of today')
  assert.equal((await call('DELETE', '/api/schedule/today')).status, 204, 'today goes back to the usual hours')
  assert.equal(await nextEvent(), 'schedule', 'and that is announced')
} finally {
  await reader.cancel()
  execFileSync('psql', ['-q', '-f', fileURLToPath(new URL('../dev-seed/seed.sql', import.meta.url))], { stdio: 'ignore' })
}

process.stdout.write(`smoke ok: live updates at ${base}\n`)
