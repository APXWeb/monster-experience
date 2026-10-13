import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

// Hardware WebGL in headless Chromium on Windows needs ANGLE on D3D11.
const local = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const launchOptions = {
  executablePath: fs.existsSync(local) ? local : undefined,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4174', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
  ],
})
