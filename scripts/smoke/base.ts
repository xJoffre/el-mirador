import assert from 'node:assert/strict'

const base = process.argv[2] ?? 'http://localhost:8080'

const home = await fetch(base)
assert.equal(home.status, 200, 'the web is served')
assert.match(await home.text(), /<div id="root">/, 'the web is the React app')

const health = await fetch(`${base}/actuator/health`)
assert.equal((await health.json()).status, 'UP', 'the app and its database are up')

const missing = await fetch(`${base}/missing.txt`)
assert.equal(missing.status, 404, 'an unknown file is a 404')
assert.equal(missing.headers.get('content-type'), 'application/problem+json', 'errors are problem details')

const unlisted = await fetch(`${base}/api/missing`)
assert.equal(unlisted.status, 401, 'an unlisted API route asks for a session')
assert.equal((await unlisted.json()).code, 'staff.signInRequired', 'the refusal carries its reason')

const page = await fetch(base)
assert.equal(page.headers.get('x-content-type-options'), 'nosniff', 'the browser does not guess content types')
assert.equal(page.headers.get('x-frame-options'), 'DENY', 'the site cannot be framed')

const events = await fetch(`${base}/api/events`, { signal: AbortSignal.timeout(5000) })
assert.equal(events.status, 200, 'the event stream opens')
assert.match(events.headers.get('content-type') ?? '', /^text\/event-stream/, 'the event stream is SSE')
await events.body?.cancel()

process.stdout.write(`smoke ok: ${base}\n`)
