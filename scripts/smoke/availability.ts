import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { GetMenuResponse, GetScheduleResponse } from '../../web/src/shared/api/schemas.ts'

const base = process.argv[2] ?? 'http://localhost:8080'
const today = `(now() at time zone 'America/Guayaquil')::date`

const sql = (statement: string) => execFileSync('psql', ['-qtAc', statement], { encoding: 'utf8' }).trim()
const menu = async () => GetMenuResponse.parse(await (await fetch(`${base}/api/menu`)).json())
const schedule = async () => GetScheduleResponse.parse(await (await fetch(`${base}/api/schedule`)).json())
const product = async (id: number) => (await menu()).categories.flatMap((category) => category.products).find((p) => p.id === id)

const wings = Number(sql(`select id from product where name ->> 'es' = 'Alitas'`))

try {
  sql(`update product set hidden = true where id = ${wings}`)
  assert.equal(await product(wings), undefined, 'a hidden product leaves the menu')

  sql(`update product set hidden = false, sold_out_on = ${today} where id = ${wings}`)
  assert.equal((await product(wings))?.sold_out, true, 'a product sold out today is shown sold out')

  sql(`update product set sold_out_on = ${today} - 1 where id = ${wings}`)
  assert.equal((await product(wings))?.sold_out, false, 'a product sold out yesterday is available again')

  sql(`update option_item set sold_out_on = ${today} where option_group_id in (select id from option_group where product_id = ${wings})`)
  assert.equal((await product(wings))?.sold_out, true, 'with every sauce sold out the wings are sold out')

  sql(`delete from daily_menu where menu_date = ${today}`)
  const withoutLunch = await menu()
  assert.deepEqual([withoutLunch.lunch, withoutLunch.lunch_includes], [[], null], 'an unpublished lunch is not served')

  sql(`insert into hours_override (override_date, opens_at, closes_at, lunch_starts_at, lunch_ends_at)
       values (${today}, '00:00', '23:59', '00:00', '23:59')`)
  sql(`insert into store_status_change (status, wait_minutes, reason, until_at)
       values ('delayed', 30, 'Local lleno', now() + interval '1 hour')`)
  const delayed = await schedule()
  assert.deepEqual([delayed.status.status, delayed.status.wait_minutes, delayed.status.reason], ['delayed', 30, 'Local lleno'], 'a delay set by the staff is shown')
  assert.equal(delayed.lunch_now, true, 'the lunch hours of the change for today apply')

  sql(`insert into store_status_change (status, until_at) values ('closed', now() - interval '1 minute')`)
  assert.equal((await schedule()).status.status, 'open', 'an expired status no longer applies')

  sql(`update hours_override set closes_at = '00:01' where override_date = ${today}`)
  const closed = await schedule()
  assert.equal(closed.today.closes_at, '00:01:00', 'the change for today replaces its hours')
  assert.equal(closed.status.status, 'closed', 'outside the hours of the day the store is closed')
} finally {
  execFileSync('psql', ['-q', '-f', fileURLToPath(new URL('../dev-seed/seed.sql', import.meta.url))], { stdio: 'ignore' })
}

process.stdout.write(`smoke ok: availability at ${base}\n`)
