import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const out = '.review/modes'
fs.mkdirSync(out, { recursive: true })
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
for (const mode of ['nogl', 'reduced']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.goto('http://localhost:5180/' + (mode === 'nogl' ? '?nogl' : ''), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  for (const t of [0, 0.5, 1]) {
    const y = await page.evaluate((p) => window.__scroll.journeyY(p), t)
    await page.evaluate((y) => window.__scroll.jump(y), y)
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(out, `${mode}-${t}.jpg`), type: 'jpeg', quality: 75 })
  }
  const y = await page.evaluate(() => document.querySelector('#sabores-stage').getBoundingClientRect().top + scrollY - 90)
  await page.evaluate((y) => window.__scroll.jump(y), y)
  await page.waitForTimeout(1200)
  await page.click('.thumb:nth-child(6)')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(out, `${mode}-catalog.jpg`), type: 'jpeg', quality: 75 })
  const canvases = await page.$$eval('canvas', (c) => c.length)
  const lenis = await page.evaluate(() => document.documentElement.classList.contains('lenis'))
  console.log(mode, { canvases, lenis, errs })
  await ctx.close()
}
await browser.close()
