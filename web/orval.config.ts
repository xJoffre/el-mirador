import { defineConfig } from 'orval'

const input = '../api/openapi.json'

export default defineConfig({
  client: {
    input,
    output: { target: 'src/shared/api/client.ts', client: 'fetch', clean: true },
  },
  schemas: {
    input,
    output: { target: 'src/shared/api/schemas.ts', client: 'zod' },
  },
})
