// Finish-review evidence: node scripts/review-captures.mjs
import { chromium, devices } from 'playwright-core'
import path from 'node:path'
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const out = '.impeccable/review'
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
async function run(name, opts, shots) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 30000 })
  for (const [file, act] of shots) {
    await act(page)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(out, file) })
  }
  await ctx.close()
}
const J = (p) => async (page) => { const y = await page.evaluate((p) => window.__scroll.journeyY(p), p); await page.evaluate((y) => window.__scroll.jump(y), y) }
const S = (sel, off = 0) => async (page) => { const y = await page.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY + o, [sel, off]); await page.evaluate((y) => window.__scroll.jump(y), y) }
const desk = [
  ['desktop.png', J(0)], ['desktop-01-origem.png', J(0.16)], ['desktop-02-formulacao.png', J(0.31)], ['desktop-03-formacao.png', J(0.47)], ['desktop-03b-callouts.png', J(0.535)],
  ['desktop-04-identidade.png', J(0.64)], ['desktop-05-envase.png', J(0.79)], ['desktop-06a-sweep-closeup.png', J(0.905)], ['desktop-06b-sweep-final.png', J(0.965)], ['desktop-06-revelacao.png', J(1)],
  ['desktop-bridge.png', S('#bridge', -450)], ['desktop-catalog.png', S('#sabores-stage', -96)],
  ['desktop-catalog-ultra.png', async (p) => { await S('#sabores-stage', -96)(p); await p.click('.filter:has-text("Monster Ultra")'); await p.click('.thumb:nth-child(2)') }],
  ['desktop-detail.png', async (p) => { await p.click('text=Ver ficha completa') }],
  ['desktop-finale.png', async (p) => { await p.keyboard.press('Escape'); await p.evaluate(() => window.__scroll.jump(document.documentElement.scrollHeight)) }],
]
const mob = [
  ['mobile.png', J(0)], ['mobile-03-formacao.png', J(0.47)], ['mobile-06-revelacao.png', J(1)], ['mobile-catalog.png', S('#sabores-stage', -96)],
  ['mobile-detail.png', async (p) => { await p.click('text=Ver ficha completa') }],
  ['mobile-finale.png', async (p) => { await p.keyboard.press('Escape'); await p.evaluate(() => window.__scroll.jump(document.documentElement.scrollHeight)) }],
]
await run('desktop', { viewport: { width: 1440, height: 900 } }, desk)
await run('mobile', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, mob)
await browser.close()
console.log('captured')
