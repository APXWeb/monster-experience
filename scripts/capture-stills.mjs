// Renders the no-WebGL fallback frames from the live 3D scene: node scripts/capture-stills.mjs <url>
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const url = process.argv[2] || 'http://localhost:5180/'
const out = 'public/stills'
fs.mkdirSync(out, { recursive: true })
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 20000 }).catch(() => {})
await page.addStyleTag({ content: '.page *, .site-header, .skip { opacity: 0 !important; }' })
const T = [0, 0.17, 0.33, 0.5, 0.665, 0.8, 1]
for (let i = 0; i < T.length; i++) {
  const y = await page.evaluate((p) => window.__scroll.journeyY(p), T[i])
  await page.evaluate((y) => window.__scroll.jump(y), y)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(out, `s${i}.jpg`), type: 'jpeg', quality: 78 })
  console.log('still', i, T[i])
}
await browser.close()
