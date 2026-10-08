import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60_000,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4173',
    launchOptions: { ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}),
      ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}),
    },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1100 } } },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true,
  },
});
