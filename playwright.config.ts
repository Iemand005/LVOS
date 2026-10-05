import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // Where your test files will live
  fullyParallel: true,
  reporter: 'html',
  use: {
    // Crucial: Tells Playwright to launch your own local Google Chrome application
    channel: 'chrome', 
    headless: false, // Set to true if you don't want the browser window popping up
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'LocalChrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
