import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: process.env.SIMULATOR_SUITE,
  testMatch: '**/*.spec.{ts,js,mts,mjs}',
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: process.env.SIMULATOR_TEST_OUTPUT,
  reporter: [['list'], ['json', { outputFile: process.env.SIMULATOR_JSON_REPORT }]],
  use: {
    baseURL: process.env.SIMULATOR_BASE_URL,
    browserName: process.env.SIMULATOR_BROWSER as 'chromium' | 'firefox' | 'webkit',
    timezoneId: 'UTC',
    locale: 'en-US',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
