import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { GetMenuResponse, GetScheduleResponse } from '../../web/src/shared/api/schemas.ts'

const base = process.argv[2] ?? 'http://localhost:8080'

const count = (sql: string) => Number(execFileSync('psql', ['-tAc', sql], { encoding: 'utf8' }).trim())

const menu = GetMenuResponse.parse(await (await fetch(`${base}/api/menu`)).json())
const products = menu.categories.flatMap((category) => category.products)

assert.equal(products.length, count('select count(*) from product where not hidden'), 'every visible product is served')
assert.equal(
  products.flatMap((product) => product.variants).length,
  count('select count(*) from product_variant v join product p on p.id = v.product_id where not p.hidden'),
  'every variant is served',
)
assert.equal(
  products.flatMap((product) => product.option_groups.flatMap((group) => group.items)).length,
  count(`select count(*) from option_item i join option_group g on g.id = i.option_group_id
         join product p on p.id = g.product_id where not p.hidden and not i.hidden`),
  'every visible option is served',
)
assert.ok(menu.lunch.length > 0, "today's lunch is served")
assert.equal(
  menu.lunch.length,
  count('select count(*) from daily_menu_dish where menu_date = (select max(menu_date) from daily_menu)'),
  'every dish of the lunch is served',
)

const schedule = GetScheduleResponse.parse(await (await fetch(`${base}/api/schedule`)).json())

assert.equal(Object.keys(schedule.week).length, count('select count(*) from weekly_hours'), 'the weekly hours are served')
assert.equal(schedule.profile.name, execFileSync('psql', ['-tAc', 'select name from store_profile'], { encoding: 'utf8' }).trim(), 'the store profile is served')

const visits = await Promise.all(
  Array.from({ length: 30 }, async () => {
    const visit = (path: string) => fetch(`${base}${path}`, { signal: AbortSignal.timeout(10_000) }).then((response) => response.status)
    return [await visit('/api/schedule'), await visit('/api/menu')]
  }),
)
assert.ok(visits.flat().every((status) => status === 200), 'thirty visits in a row do not exhaust the database connections')

process.stdout.write(`smoke ok: menu and schedule at ${base}\n`)
