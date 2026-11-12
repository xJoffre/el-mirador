import { writeFileSync } from 'node:fs'

const name = process.argv[2]
if (!name?.match(/^[a-z][a-z0-9-]*$/)) {
  process.stderr.write('usage: node scripts/new-migration.ts <kebab-name>\n')
  process.exit(1)
}

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const id = `${stamp}-${name}`
const path = `backend/src/main/resources/db/changelog/changes/${id}.sql`

writeFileSync(path, `--liquibase formatted sql\n\n--changeset el-mirador:${id}\n\n--rollback\n`, { flag: 'wx' })
process.stdout.write(`${path}\n`)
