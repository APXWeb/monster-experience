import { test, expect, type Page } from '@playwright/test'
import catalog from '../../src/data/catalog.json' with { type: 'json' }

const ready = async (page: Page, query = '') => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('requestfailed', (r) => errors.push(`failed ${r.url()}`))
  await page.goto('/' + query)
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 30_000 })
  return errors
}

const jumpJourney = async (page: Page, p: number) => {
  const y = await page.evaluate((p) => (window as any).__scroll.journeyY(p), p)
  await page.evaluate((y) => (window as any).__scroll.jump(y), y)
}
const jumpTo = async (page: Page, sel: string, off = 0) => {
  const y = await page.evaluate(([s, o]) => document.querySelector(s as string)!.getBoundingClientRect().top + scrollY + (o as number), [sel, off])
  await page.evaluate((y) => (window as any).__scroll.jump(y), y)
}

/** Mean absolute difference (0..255) between two PNG screenshots, computed in the page. */
async function imageDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([a, b]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((r) => {
          const i = new Image()
          i.onload = () => r(i)
          i.src = 'data:image/png;base64,' + src
        })
      const [ia, ib] = await Promise.all([load(a), load(b)])
      const c = document.createElement('canvas')
      c.width = 320
      c.height = Math.round((ia.height / ia.width) * 320)
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(ia, 0, 0, c.width, c.height)
      const da = g.getImageData(0, 0, c.width, c.height).data
      g.drawImage(ib, 0, 0, c.width, c.height)
      const db = g.getImageData(0, 0, c.width, c.height).data
      let sum = 0
      for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
      return sum / (da.length * 0.75)
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

test('loads with WebGL, no errors, opening composed', async ({ page }) => {
  const errors = await ready(page)
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Toda lata')
  await expect(page.locator('.scroll-cue')).toBeVisible()
  expect(errors).toEqual([])
})

test('journey advances with scroll and the rail tracks the station', async ({ page, isMobile }) => {
  await ready(page)
  const stations = ['Origem', 'Pesquisa e formulação', 'Formação da lata', 'Identidade', 'Envase e acabamento', 'Revelação']
  const at = [0.14, 0.3, 0.46, 0.63, 0.78, 0.95]
  for (let i = 0; i < at.length; i++) {
    await jumpJourney(page, at[i])
    await page.waitForTimeout(400)
    const panel = page.locator('.station').nth(i)
    await expect.poll(async () => Number(await panel.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.9)
    if (isMobile) await expect(page.locator('.rail-mobile-label')).toContainText(stations[i])
    else await expect(page.locator('.rail-item.is-on .rail-label')).toHaveText(stations[i])
  }
})

test('scrolling back replays the same frame (reversible)', async ({ browser }) => {
  // Reduced motion freezes idle drift so two visits to the same scroll point must match.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await ready(page)
  for (const p of [0.18, 0.47, 0.64, 0.8]) {
    await jumpJourney(page, p)
    await page.waitForTimeout(2500)
    const down = await page.screenshot()
    await jumpJourney(page, Math.min(1, p + 0.17))
    await page.waitForTimeout(1200)
    await jumpJourney(page, p)
    await page.waitForTimeout(2500)
    const up = await page.screenshot()
    const d = await imageDiff(page, down, up)
    expect(d, `frame diff at ${p}`).toBeLessThan(2.5)
  }
  await ctx.close()
})

test('catalog lists every confirmed variant and filters by line', async ({ page }) => {
  await ready(page)
  await jumpTo(page, '#sabores-stage', -90)
  await expect(page.locator('.thumb')).toHaveCount(catalog.products.length)
  for (const line of catalog.lines) {
    await page.locator('.filter', { hasText: line.name }).click()
    const expected = catalog.products.filter((p) => p.line === line.id).map((p) => p.displayName)
    await expect(page.locator('.thumb-name')).toHaveText(expected)
    await expect(page.locator('.filter', { hasText: line.name })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.locator('.filter', { hasText: 'Todas' }).click()
  await expect(page.locator('.thumb')).toHaveCount(17)
})

test('selecting a flavor updates its own official figures', async ({ page }) => {
  await ready(page)
  await jumpTo(page, '#sabores-stage', -90)
  for (const p of catalog.products) {
    await page.locator(`.thumb[data-id="${p.id}"]`).click()
    await expect(page.locator('.stage-name')).toHaveText(p.displayName)
    await expect(page.locator('.stage-flavor')).toHaveText(p.flavor)
    const vals = await page.locator('.stage-info .gauge').evaluateAll((els) => els.map((e) => e.querySelector('.gauge-num')?.textContent ?? null))
    const exp = (['calories', 'caffeine', 'sugars'] as const).map((k) => {
      const f = (p.figures as Record<string, { value: number }>)[k]
      return f ? f.value.toLocaleString('pt-BR') : null
    })
    expect(vals).toEqual(exp)
  }
})

test('detail panel: open, data blocks, next/prev, keyboard close', async ({ page }) => {
  await ready(page)
  await jumpTo(page, '#sabores-stage', -90)
  await page.locator('.thumb[data-id="juice-mango-loco"]').click()
  await page.getByRole('button', { name: 'Ver ficha completa' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('#detail-title')).toHaveText('Juice Mango Loco')
  await expect(dialog).toContainText('Descrição oficial')
  await expect(dialog).toContainText('473')
  await expect(dialog).toContainText('Alto em açúcar adicionado')
  await expect(dialog.locator('.detail-sources a').first()).toHaveAttribute('href', /monsterenergy\.com\/pt-br/)
  await dialog.locator('.detail-step-next').click()
  await expect(dialog.locator('#detail-title')).toHaveText('Juice Khaotic')
  await dialog.locator('.detail-step').first().click()
  await expect(dialog.locator('#detail-title')).toHaveText('Juice Mango Loco')
  await page.keyboard.press('Escape')
  await expect(page.locator('.detail')).not.toHaveClass(/is-open/)
})

test('missing official fields are labelled, never filled', async ({ page }) => {
  await ready(page)
  await jumpTo(page, '#sabores-stage', -90)
  // 269 ml page publishes no total sugars; Strawberry Dreams publishes no volume.
  await page.locator('.thumb[data-id="original-green-269ml"]').click()
  await expect(page.locator('.stage-info .gauge').nth(2)).toContainText('Não informado')
  await page.locator('.thumb[data-id="ultra-strawberry-dreams"]').click()
  await page.getByRole('button', { name: 'Ver ficha completa' }).click()
  await expect(page.getByRole('dialog')).toContainText('Não informado na página oficial consultada')
})

test('strip is keyboard navigable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path is a desktop concern')
  await ready(page)
  await jumpTo(page, '#sabores-stage', -90)
  await page.locator('.thumb.is-on').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.stage-name')).toHaveText(catalog.products[1].displayName)
  await page.keyboard.press('End')
  await expect(page.locator('.stage-name')).toHaveText(catalog.products.at(-1)!.displayName)
  await expect(page.locator('.thumb.is-on')).toBeFocused()
})

test('no horizontal overflow and disclaimer present', async ({ page }) => {
  await ready(page)
  for (const sel of ['#journey', '#sabores-stage', '#finale']) {
    await jumpTo(page, sel)
    await page.waitForTimeout(300)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }
  await expect(page.locator('.finale-disclaimer')).toHaveText(
    'Projeto conceitual desenvolvido pela APX Web. Não afiliado ou endossado pela Monster Energy.',
  )
})

test('without WebGL: stills and official images carry the experience', async ({ page }) => {
  const errors = await ready(page, '?nogl')
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.locator('html')).toHaveClass(/no-webgl/)
  await expect(page.locator('.still').first()).toBeVisible()
  await jumpTo(page, '#sabores-stage', -90)
  await expect(page.locator('.can-fallback')).toBeVisible()
  expect(errors).toEqual([])
})

test('reduced motion: no smooth-scroll hijack, still fully usable', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = await ready(page)
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false)
  await jumpTo(page, '#sabores-stage', -90)
  await page.locator('.thumb[data-id="ultra-violet"]').click()
  await expect(page.locator('.stage-name')).toHaveText('Ultra Violet')
  expect(errors).toEqual([])
  await ctx.close()
})

test('every product record is sourced and its image exists', async ({ request }) => {
  for (const p of catalog.products) {
    expect(p.sources.some((s) => s.url.startsWith('https://www.monsterenergy.com/pt-br/'))).toBe(true)
    for (const img of [p.image, p.image.replace('products/', 'products/hd/')]) {
      const r = await request.get('/' + img)
      expect(r.ok(), img).toBe(true)
    }
  }
  expect(catalog.products).toHaveLength(17)
})
