import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sources = readdirSync(`${root}backend/src/main/java`, { recursive: true, encoding: 'utf8' }).filter((file) => file.endsWith('.java'))
const thrown = new Set(sources.flatMap((file) => [...readFileSync(`${root}backend/src/main/java/${file}`, 'utf8').matchAll(/"((?:menu|orders|staff|invoicing|schedule|shared)\.[a-zA-Z]+)"/g)].map((match) => match[1])))
const errors: Record<string, Record<string, string>> = JSON.parse(readFileSync(`${root}web/src/shared/i18n/es/errors.json`, 'utf8'))
const missing = [...thrown].filter((code) => {
  const [module, key] = code.split('.')
  return !errors[module]?.[key]
})

if (missing.length > 0) {
  process.stderr.write(`error codes without a text in errors.json: ${missing.join(', ')}\n`)
  process.exit(1)
}
process.stdout.write(`error codes ok: ${thrown.size} codes have their text\n`)
