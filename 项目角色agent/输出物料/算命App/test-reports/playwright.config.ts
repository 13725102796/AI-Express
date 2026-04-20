import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-html-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
