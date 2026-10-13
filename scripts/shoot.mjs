// Review captures: node scripts/shoot.mjs <url> <outDir> <w> <h> <list of journey t or named targets>
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const [url, out, w, h, ...targets] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader=false'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !document.querySelector('.loader') , null, { timeout: 20000 }).catch(() => logs.push('loader did not clear'))
await page.waitForTimeout(800)
for (const tg of targets) {
  let y
  if (tg.startsWith('#')) y = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, tg)
  else if (tg.startsWith('y')) y = +tg.slice(1)
  else y = await page.evaluate((p) => window.__scroll.journeyY(p), +tg)
  await page.evaluate((y) => window.__scroll.jump(y), y)
  await page.waitForTimeout(1600)
  const file = path.join(out, `${String(tg).replace(/[#.]/g, '_')}.jpg`)
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 })
}
const gpu = await page.evaluate(() => {
  const c = document.createElement('canvas'); const g = c.getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL)
})
console.log('renderer', gpu)
console.log(logs.slice(0, 30).join('\n') || 'no console errors')
await browser.close()
