import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './Tests',
  fullyParallel: false,
  reporter: 'line',
  workers: 1,
  use: {
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'LocalChrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
