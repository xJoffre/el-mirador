import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    ...devices['Desktop Chrome'],
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
  },
})
