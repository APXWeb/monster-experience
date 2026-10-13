// Frame-time sweep across the whole page: node scripts/perf.mjs <url> <w> <h> [cpuThrottle]
import { chromium } from 'playwright-core'
import path from 'node:path'
const [url, w, h, thr] = process.argv.slice(2)
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
if (thr) { const s = await page.context().newCDPSession(page); await s.send('Emulation.setCPUThrottlingRate', { rate: +thr }) }
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('requestfailed', (r) => errs.push('failed ' + r.url()))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 30000 }).catch(() => {})
await page.evaluate(() => {
  window.__cls = 0
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: 'layout-shift', buffered: true })
  window.__long = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true })
})
const res = await page.evaluate(async () => {
  const total = document.documentElement.scrollHeight - innerHeight
  const frames = []
  const spikes = []
  let last = performance.now()
  const steps = 900
  for (let i = 0; i <= steps; i++) {
    window.scrollTo(0, (total * i) / steps)
    await new Promise((r) => requestAnimationFrame(r))
    const now = performance.now(); frames.push(now - last); spikes.push([now - last, i / steps]); last = now
  }
  spikes.sort((a, b) => b[0] - a[0]); window.__spikes = spikes.slice(0, 10).map(([d, p]) => `${d.toFixed(0)}ms@${(p * 100).toFixed(1)}%`)
  frames.sort((a, b) => a - b)
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length
  return { avg: +avg.toFixed(2), p50: +frames[frames.length >> 1].toFixed(2), p95: +frames[Math.floor(frames.length * 0.95)].toFixed(2), max: +frames[frames.length - 1].toFixed(1) }
})
const cls = await page.evaluate(() => window.__cls)
console.log('spikes', await page.evaluate(() => window.__spikes.join(' ')), 'journeyEnd%', await page.evaluate(() => { const j = document.getElementById('journey'); return ((j.offsetTop + j.offsetHeight - innerHeight) / (document.documentElement.scrollHeight - innerHeight) * 100).toFixed(1) }))
const longs = await page.evaluate(() => window.__long.length)
const mem = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + 'MB' : 'n/a')
console.log(JSON.stringify({ viewport: `${w}x${h}`, cpuThrottle: thr || 1, frameMs: res, cls: +cls.toFixed(4), longTasks: longs, heap: mem, errors: errs }))
await browser.close()
