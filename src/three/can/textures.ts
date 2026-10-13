import * as THREE from 'three'
import { assetUrl } from '@/data/products'
import { CAN_H, CAN_R } from './profiles'

/**
 * Label layers for the journey can, composed on canvas from the OFFICIAL claw and
 * wordmark artwork (public/brand, taken from monsterenergy.com). Nothing is redrawn:
 * the marks are placed and scaled with their own proportions.
 *
 * Layout reference: the Original Green render on the official pt-BR product page.
 * u = 0.5 is the front of the can; canvas row 0 is the top of the can (v = 1).
 */

const W = 2048
const H = 1536
const PX_U = W / (2 * Math.PI * CAN_R) // texels per unit around the circumference
const PX_V = H / CAN_H // texels per unit of height

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const rowOf = (y: number) => H - y * PX_V

function canvas() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
}

function toTexture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer, srgb = true) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.wrapS = THREE.RepeatWrapping
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.needsUpdate = true
  return t
}

export interface LabelLayers {
  /** Black ink field (rgb) with coverage in alpha. */
  base: THREE.CanvasTexture
  /** Claw + wordmark on transparent. */
  graphics: THREE.CanvasTexture
  /** Separate claw-only coverage in R, wordmark in G, used to stage the print. */
  masks: THREE.CanvasTexture
}

export async function buildLabel(renderer: THREE.WebGLRenderer): Promise<LabelLayers> {
  const [claw, word] = await Promise.all([
    loadImage(assetUrl('brand/claw.webp')),
    loadImage(assetUrl('brand/wordmark.png')),
  ])

  // Base ink: glossy black with a faint printed grain, from chime to the top of the neck.
  const base = canvas()
  {
    const g = base.getContext('2d')!
    const top = rowOf(1.505)
    const bottom = rowOf(0.06)
    g.fillStyle = '#0b0c0b'
    g.fillRect(0, top, W, bottom - top)
    const img = g.getImageData(0, top, W, bottom - top)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 7
      d[i] += n
      d[i + 1] += n
      d[i + 2] += n
    }
    g.putImageData(img, 0, 0 + top)
    // Soft edges where the ink meets bare metal.
    const fade = (y0: number, y1: number) => {
      const gr = g.createLinearGradient(0, y0, 0, y1)
      gr.addColorStop(0, 'rgba(0,0,0,1)')
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      g.globalCompositeOperation = 'destination-out'
      g.fillStyle = gr
      g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0))
      g.globalCompositeOperation = 'source-over'
    }
    fade(top - 1, top + 3)
    fade(bottom + 1, bottom - 3)
  }

  // Graphics: the claw centred on the front, the wordmark below it.
  const graphics = canvas()
  const masks = canvas()
  {
    const g = graphics.getContext('2d')!
    const m = masks.getContext('2d')!
    m.fillStyle = '#000'
    m.fillRect(0, 0, W, H)

    const clawH = 0.86 * PX_V
    const clawW = clawH * (claw.width / claw.height) * (PX_U / PX_V)
    const clawCx = W / 2
    const clawCy = rowOf(0.86)
    g.drawImage(claw, clawCx - clawW / 2, clawCy - clawH / 2, clawW, clawH)

    const wordW = 0.6 * PX_U
    const wordH = wordW * (word.height / word.width) * (PX_V / PX_U)
    const wordCy = rowOf(0.285)
    g.drawImage(word, W / 2 - wordW / 2, wordCy - wordH / 2, wordW, wordH)

    // Masks: R marks the claw region, G the wordmark region (for staged printing).
    m.globalCompositeOperation = 'lighter'
    const tint = (img: HTMLImageElement, x: number, y: number, w: number, h: number, color: string) => {
      const c = document.createElement('canvas')
      c.width = Math.ceil(w)
      c.height = Math.ceil(h)
      const cg = c.getContext('2d')!
      cg.drawImage(img, 0, 0, w, h)
      cg.globalCompositeOperation = 'source-in'
      cg.fillStyle = color
      cg.fillRect(0, 0, w, h)
      m.drawImage(c, x, y)
    }
    tint(claw, clawCx - clawW / 2, clawCy - clawH / 2, clawW, clawH, '#f00')
    tint(word, W / 2 - wordW / 2, wordCy - wordH / 2, wordW, wordH, '#0f0')
  }

  return {
    base: toTexture(base, renderer),
    graphics: toTexture(graphics, renderer),
    masks: toTexture(masks, renderer, false),
  }
}

/**
 * Tileable condensation normal map: hemispherical droplets of mixed sizes,
 * with a few elongated runs. Generated once at startup.
 */
export function buildDroplets(size = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = 'rgb(128,128,255)'
  g.fillRect(0, 0, size, size)
  const img = g.getImageData(0, 0, size, size)
  const d = img.data
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const drop = (cx: number, cy: number, rx: number, ry: number) => {
    const x0 = Math.floor(cx - rx - 1)
    const y0 = Math.floor(cy - ry - 1)
    for (let y = y0; y <= cy + ry + 1; y++) {
      for (let x = x0; x <= cx + rx + 1; x++) {
        const nx = (x - cx) / rx
        const ny = (y - cy) / ry
        const r2 = nx * nx + ny * ny
        if (r2 > 1) continue
        const nz = Math.sqrt(1 - r2)
        const px = ((x % size) + size) % size
        const py = ((y % size) + size) % size
        const i = (py * size + px) * 4
        d[i] = Math.round((nx * 0.5 + 0.5) * 255)
        d[i + 1] = Math.round((-ny * 0.5 + 0.5) * 255)
        d[i + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      }
    }
  }
  for (let i = 0; i < 900; i++) {
    const r = 1.2 + Math.pow(rnd(), 3) * 7
    drop(rnd() * size, rnd() * size, r, r * (0.9 + rnd() * 0.25))
  }
  for (let i = 0; i < 26; i++) {
    const r = 3 + rnd() * 4
    drop(rnd() * size, rnd() * size, r, r * (1.6 + rnd() * 1.4))
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(5, 3.4)
  t.needsUpdate = true
  return t
}

/**
 * Loads a pre-padded product texture (public/products/tex, built by
 * tools/compose-hd.py). Decoding runs off the main thread via createImageBitmap,
 * so switching flavors or warming the rack never blocks scrolling.
 */
export async function loadProductTexture(path: string, renderer: THREE.WebGLRenderer) {
  const res = await fetch(assetUrl(path))
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' })
  const t = new THREE.Texture(bitmap as unknown as HTMLImageElement)
  t.flipY = false
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.needsUpdate = true
  return { texture: t, aspect: bitmap.height / bitmap.width }
}
