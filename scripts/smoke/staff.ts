import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'
import { client, signIn } from './client.ts'

const base = process.argv[2] ?? 'http://localhost:8080'

function png(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const typed = Buffer.concat([Buffer.from(type), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(typed))
    return Buffer.concat([length, typed, checksum])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const rows = Buffer.alloc((width * 3 + 1) * height, 200)
  for (let row = 0; row < height; row++) rows[row * (width * 3 + 1)] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function jpegWidth(jpeg: Buffer) {
  for (let at = 2; at < jpeg.length; at += 2 + jpeg.readUInt16BE(at + 2)) {
    if (jpeg[at + 1] >= 0xc0 && jpeg[at + 1] <= 0xc2) return jpeg.readUInt16BE(at + 7)
  }
  throw new Error('not a jpeg')
}

const anyone = client(base)
const members: { id: number; name: string }[] = (await anyone('GET', '/api/staff/members')).body
const idOf = (name: string) => members.find((member) => member.name === name)!.id
const publicProduct = async (id: number) =>
  (await anyone('GET', '/api/menu')).body.categories.flatMap((category: { products: { id: number }[] }) => category.products).find((product: { id: number }) => product.id === id)

try {
  const statuses = []
  for (let attempt = 0; attempt < 5; attempt++) statuses.push((await signIn(anyone, 'Cocina', '000000')).status)
  assert.deepEqual(statuses, [401, 401, 401, 401, 423], 'five wrong PINs lock the user')
  assert.equal((await signIn(anyone, 'Cocina', '333333')).status, 423, 'a locked user cannot sign in even with the right PIN')

  const waiter = client(base)
  assert.equal((await waiter('POST', '/api/staff/session', { staff_id: idOf('Mesero'), pin: '222222' })).status, 403, 'a form without the CSRF token is refused')
  assert.equal((await signIn(waiter, 'Mesero', '222222')).status, 200, 'the waiter signs in')
  assert.equal((await waiter('GET', '/api/menu/catalog')).status, 403, 'a waiter cannot edit the menu')
  assert.equal((await waiter('PUT', '/api/menu/products/1/sold-out', { sold_out: true })).status, 204, 'a waiter marks a dish sold out')
  assert.equal((await publicProduct(1)).sold_out, true, 'the customer sees it sold out')
  assert.equal((await waiter('DELETE', '/api/staff/session')).status, 204, 'the waiter signs out')
  assert.equal((await waiter('GET', '/api/staff/session')).status, 401, 'after signing out there is no session')

  const manager = client(base)
  assert.equal((await signIn(manager, 'Encargada', '123456')).status, 200, 'the manager signs in')
  const form = {
    category_id: 1,
    name: { es: 'Bolón de prueba' },
    description: { es: 'Solo para la prueba de humo' },
    dine_in_only: false,
    hidden: false,
    variants: [{ id: null, name: null, price: 2.5 }],
    option_groups: [{ id: null, name: { es: 'Salsa' }, min_choices: 1, max_choices: 1, items: [{ id: null, name: { es: 'Maní' }, hidden: false }] }],
  }
  const created = await manager('POST', '/api/menu/products', form)
  assert.equal(created.status, 200, 'the manager creates a dish')
  const id: number = created.body.id
  assert.equal((await publicProduct(id)).variants[0].price, 2.5, 'the new dish is on the menu')

  const saved = (await publicProduct(id))
  const edited = {
    ...form,
    variants: [{ id: saved.variants[0].id, name: { es: 'Entero' }, price: 3 }, { id: null, name: { es: 'Medio' }, price: 1.75 }],
    option_groups: [{ ...form.option_groups[0], id: saved.option_groups[0].id, items: [{ id: saved.option_groups[0].items[0].id, name: { es: 'Maní' }, hidden: false }, { id: null, name: { es: 'Queso' }, hidden: false }] }],
  }
  assert.equal((await manager('PUT', `/api/menu/products/${id}`, edited)).status, 204, 'the manager edits the dish')
  const updated = await publicProduct(id)
  assert.deepEqual(updated.variants.map((variant: { name: { es: string }; price: number }) => [variant.name.es, variant.price]), [['Entero', 3], ['Medio', 1.75]], 'prices and sizes are saved in order')
  assert.equal(updated.variants[0].id, saved.variants[0].id, 'an edited size keeps its id')
  assert.equal(updated.option_groups[0].items.length, 2, 'choices are saved')

  const upload = new FormData()
  upload.append('file', new Blob([png(1500, 1000)], { type: 'image/png' }), 'foto.png')
  const photo = await manager('PUT', `/api/menu/products/${id}/photo`, upload)
  assert.equal(photo.status, 200, 'the manager uploads a photo')
  const jpeg = Buffer.from(await (await fetch(`${base}${photo.body.photo}`)).arrayBuffer())
  assert.equal(jpegWidth(jpeg), 600, 'the photo is stored at 600 px')
  assert.equal((await publicProduct(id)).photo, photo.body.photo, 'the menu shows the photo')

  assert.equal((await manager('DELETE', `/api/menu/products/${id}`)).status, 204, 'the manager deletes the dish')
  assert.equal(await publicProduct(id), undefined, 'the deleted dish leaves the menu')
  assert.equal((await fetch(`${base}${photo.body.photo}`)).status, 404, 'its photo is deleted too')

  const newcomer = await manager('POST', '/api/staff/users', { name: 'Prueba', role: 'floor', pin: '444444' })
  assert.equal(newcomer.status, 200, 'the manager adds a waiter')
  assert.equal((await manager('POST', '/api/staff/users', { name: 'Prueba', role: 'floor', pin: '444444' })).body.code, 'shared.duplicate', 'names are unique')
  assert.equal((await manager('POST', '/api/staff/users', { name: 'Otra', role: 'floor', pin: '12' })).status, 400, 'a PIN has six digits')
  assert.equal((await manager('PUT', `/api/staff/users/${idOf('Encargada')}`, { name: 'Encargada', role: 'floor', active: true, pin: null })).body.code, 'staff.ownAccess', 'nobody removes their own role')

  const newcomerSession = client(base)
  await newcomerSession('GET', '/api/staff/members')
  assert.equal((await newcomerSession('POST', '/api/staff/session', { staff_id: newcomer.body.id, pin: '444444' })).status, 200, 'the new waiter signs in')
  await manager('PUT', `/api/staff/users/${newcomer.body.id}`, { name: 'Prueba', role: 'floor', active: false, pin: null })
  assert.equal((await newcomerSession('GET', '/api/staff/session')).status, 401, 'a deactivated user loses the open session at once')

  assert.equal((await manager('PUT', '/api/schedule/profile', { name: 'El Mirador', address: 'Zaruma', whatsapp: '593999999999', bank_account: null, delivery_note: null })).status, 204, 'the manager edits the store details')
  assert.equal((await anyone('GET', '/api/schedule')).body.profile.whatsapp, '593999999999', 'the website shows the new details')
  assert.equal((await manager('PUT', '/api/schedule/profile', { name: 'El Mirador', address: null, whatsapp: '+593 99', bank_account: null, delivery_note: null })).status, 400, 'a WhatsApp number is digits only')
} finally {
  execFileSync('psql', ['-q', '-f', fileURLToPath(new URL('../dev-seed/seed.sql', import.meta.url))], { stdio: 'ignore' })
}

process.stdout.write(`smoke ok: staff and administration at ${base}\n`)
