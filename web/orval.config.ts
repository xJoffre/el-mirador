import { defineConfig } from 'orval'

const input = '../api/openapi.json'

export default defineConfig({
  client: {
    input,
    output: {
      target: 'src/shared/api/client.ts',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: 'src/shared/lib/request.ts', name: 'request' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  schemas: {
    input,
    output: { target: 'src/shared/api/schemas.ts', client: 'zod' },
  },
})
