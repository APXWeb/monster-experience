import Lenis from 'lenis'
import { clamp01 } from '@/data/stations'

/**
 * Single source of truth for scroll-derived progress. Everything that moves with
 * the scroll (3D rig, station overlays, rail) reads this mutable object inside its
 * own frame loop, so scrolling never triggers React renders.
 */
export const scroll = {
  y: 0,
  vh: 1,
  vw: 1,
  /** 0..1 across the pinned journey (hero + six stations). */
  journey: 0,
  /** 0..1 while the catalog stage slides in over the reveal. */
  bridge: 0,
  /** 0..1 across the closing section. */
  finale: 0,
  /** Seconds since the last scroll movement; the rig idles when this grows. */
  velocity: 0,
}

export const motion = {
  reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  coarse: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
}

let lenis: Lenis | null = null
const listeners = new Set<() => void>()

export const onScroll = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

interface Track {
  el: HTMLElement
  key: 'journey' | 'bridge' | 'finale'
  /** Start offset: 'pin' = progress over (height - vh); 'enter' = from entering viewport to top. */
  mode: 'pin' | 'enter' | 'through'
}

let tracks: Track[] = []

export function measure() {
  scroll.vh = window.innerHeight
  scroll.vw = window.innerWidth
  tracks = []
  const j = document.getElementById('journey')
  const b = document.getElementById('bridge')
  const f = document.getElementById('finale')
  if (j) tracks.push({ el: j, key: 'journey', mode: 'pin' })
  if (b) tracks.push({ el: b, key: 'bridge', mode: 'enter' })
  if (f) tracks.push({ el: f, key: 'finale', mode: 'through' })
  update(window.scrollY)
}

function update(y: number) {
  scroll.velocity = y - scroll.y
  scroll.y = y
  const vh = scroll.vh
  for (const t of tracks) {
    const top = t.el.offsetTop
    const h = t.el.offsetHeight
    let p = 0
    if (t.mode === 'pin') p = (y - top) / Math.max(1, h - vh)
    else if (t.mode === 'enter') p = (y - (top - vh)) / vh
    else p = (y - (top - vh)) / Math.max(1, h)
    scroll[t.key] = clamp01(p)
  }
  listeners.forEach((fn) => fn())
}

export function initScroll() {
  measure()
  const onResize = () => measure()
  window.addEventListener('resize', onResize)
  const ro = new ResizeObserver(() => measure())
  ro.observe(document.body)

  if (!motion.reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.1, syncTouch: false })
    lenis.on('scroll', (e: Lenis) => update(e.scroll))
    const raf = (time: number) => {
      lenis?.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  } else {
    window.addEventListener('scroll', () => update(window.scrollY), { passive: true })
  }
  // Test hook: jump without easing (used by the Playwright review scripts).
  ;(window as unknown as { __scroll: unknown }).__scroll = {
    state: scroll,
    jump(y: number) {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
      update(y)
    },
    journeyY(p: number) {
      const j = document.getElementById('journey')!
      return j.offsetTop + p * (j.offsetHeight - scroll.vh)
    },
  }
  return () => {
    window.removeEventListener('resize', onResize)
    ro.disconnect()
    lenis?.destroy()
    lenis = null
  }
}

export function scrollToEl(target: HTMLElement | string, offset = 0) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.6 })
  else window.scrollTo({ top: el.offsetTop + offset, behavior: motion.reduced ? 'auto' : 'smooth' })
}

/** Scroll to a fraction of the journey (used by the station rail). */
export function scrollToJourney(p: number) {
  const j = document.getElementById('journey')
  if (!j) return
  const top = j.offsetTop + p * (j.offsetHeight - scroll.vh)
  if (lenis) lenis.scrollTo(top, { duration: 1.8 })
  else window.scrollTo({ top, behavior: motion.reduced ? 'auto' : 'smooth' })
}

export const stopScroll = () => lenis?.stop()
export const startScroll = () => lenis?.start()
