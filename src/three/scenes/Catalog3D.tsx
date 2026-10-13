import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRODUCTS, productById, textureImage } from '@/data/products'
import { useStore } from '@/state/store'
import { frame } from '../frame'
import { canParts } from '../can/parts'
import { makeMetalMaterial, makeProductMaterial, productHeight, type ProductUniforms } from '../can/materials'
import { loadProductTexture } from '../can/textures'
import { CAN_H } from '../can/profiles'
import { X_REVEAL, smooth, smoother } from '../timeline'
import { segment } from '@/data/stations'
import { tier } from '../tier'

/* ---------- texture cache for the official renders ---------- */

type Entry = { texture: THREE.Texture; aspect: number }
// Keyed by image path: the featured can always gets the HD render; the rack does on capable devices.
const cache = new Map<string, Promise<Entry>>()

function useProductTextures(hd: boolean) {
  const gl = useThree((s) => s.gl)
  const stageReady = useStore((s) => s.stageReady)
  const [ready, setReady] = useState<Record<string, Entry>>({})
  useEffect(() => {
    if (!stageReady) return
    let alive = true
    let started = false
    const start = () => {
      if (started || !alive) return
      started = true
      load()
    }
    // Idle time after the opening is on screen; the catalog is far down the page.
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback
    const t = window.setTimeout(start, 2500)
    if (idle) idle(start, { timeout: 2500 })
    const load = () => {
    // Selected first, then the rest, so the stage never waits on the whole catalog.
    const first = useStore.getState().selectedId
    const order = [productById(first), ...PRODUCTS.filter((p) => p.id !== first)]
    // One texture per idle slice, so decoding and upload never stack into a long task.
    const pause = () => new Promise<void>((r) => (idle ? idle(() => r(), { timeout: 400 }) : window.setTimeout(r, 60)))
    ;(async () => {
      for (const p of order) {
        if (!alive) return
        const path = textureImage(p, hd)
        if (!cache.has(path))
          cache.set(
            path,
            loadProductTexture(path, gl).then((e) => {
              gl.initTexture(e.texture)
              return e
            }),
          )
        const e = await cache.get(path)!
        if (alive) setReady((r) => (r[p.id] ? r : { ...r, [p.id]: e }))
        await pause()
      }
    })()
    }
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [stageReady, gl, hd])
  return ready
}

function useProductCan() {
  const parts = canParts()
  const uniforms = useMemo<ProductUniforms>(
    () => ({ uMap: { value: null }, uAspect: { value: 2.52 }, uFade: { value: 1 }, uScaleY: { value: 1 } }),
    [],
  )
  const body = useMemo(() => makeProductMaterial(uniforms), [uniforms])
  const lidU = useMemo(() => ({ uDissolve: { value: 0 }, uEdge: { value: new THREE.Color('#9dff3c') } }), [])
  const lid = useMemo(() => {
    const m = makeMetalMaterial(lidU, '#c8ccd0', 0.24)
    m.transparent = true
    return m
  }, [lidU])
  useEffect(() => () => {
    body.dispose()
    lid.dispose()
  }, [body, lid])
  return { parts, uniforms, body, lid }
}

function apply(u: ProductUniforms, e: Entry | undefined, scaleNode: THREE.Object3D) {
  if (!e) return
  u.uMap.value = e.texture
  u.uAspect.value = e.aspect
  const sy = productHeight(e.aspect) / CAN_H
  u.uScaleY.value = sy
  scaleNode.scale.set(1, sy, 1)
}

/* ---------- the featured can on the catalog stage ---------- */

/** One texture, loaded on demand into the shared cache. */
function loadOne(path: string, gl: THREE.WebGLRenderer) {
  if (!cache.has(path))
    cache.set(
      path,
      loadProductTexture(path, gl).then((e) => {
        gl.initTexture(e.texture)
        return e
      }),
    )
  return cache.get(path)!
}

export function CatalogCan() {
  const gl = useThree((s) => s.gl)
  // Capable devices warm every flavor in HD; phones warm the light set and fetch
  // the HD render only for the flavor actually on stage.
  const textures = useProductTextures(!tier.low)
  const selectedId = useStore((s) => s.selectedId)
  const stageReady = useStore((s) => s.stageReady)
  const [hdOnDemand, setHd] = useState<Record<string, Entry>>({})
  useEffect(() => {
    if (!tier.low || !stageReady) return
    let alive = true
    loadOne(textureImage(productById(selectedId), true), gl).then((e) => alive && setHd((r) => (r[selectedId] ? r : { ...r, [selectedId]: e })))
    return () => {
      alive = false
    }
  }, [selectedId, stageReady, gl])
  const pick = (id: string) => hdOnDemand[id] ?? textures[id]
  const appliedHd = useRef<string | null>(null)
  const { parts, uniforms, body, lid } = useProductCan()
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const shown = useRef<string | null>(null)
  const anim = useRef({ from: 0, start: -1, swap: false, next: '' })
  const sway = useRef(0)

  useFrame(() => {
    const g = group.current!
    const show = frame.handoff > 0.001 && frame.slot.visible
    g.visible = show && !!uniforms.uMap.value
    const wanted = useStore.getState().selectedId

    // First texture, or a selection change: spin a full turn and swap on the far side.
    if (shown.current === null && pick(wanted)) {
      shown.current = wanted
      apply(uniforms, pick(wanted), inner.current!)
    } else if (shown.current && wanted !== shown.current && anim.current.start < 0 && pick(wanted)) {
      anim.current = { from: 0, start: frame.time, swap: false, next: wanted }
    } else if (shown.current && anim.current.start < 0 && hdOnDemand[shown.current] && appliedHd.current !== shown.current) {
      // The HD render landed for the flavor on stage: same image, sharper, swapped in place.
      appliedHd.current = shown.current
      apply(uniforms, hdOnDemand[shown.current], inner.current!)
    }
    let turn = 0
    let fade = 1
    if (anim.current.start >= 0) {
      const dur = frame.reduced ? 0.36 : 0.95
      const k = Math.min(1, (frame.time - anim.current.start) / dur)
      if (frame.reduced) fade = Math.abs(1 - k * 2)
      else turn = smoother(k) * Math.PI * 2
      if (!anim.current.swap && k >= 0.5) {
        anim.current.swap = true
        shown.current = anim.current.next
        appliedHd.current = hdOnDemand[anim.current.next] ? anim.current.next : null
        apply(uniforms, pick(anim.current.next), inner.current!)
      }
      if (k >= 1) anim.current.start = -1
    }
    if (!g.visible) return

    const s = frame.slot.height / CAN_H
    g.position.copy(frame.slot.pos)
    g.scale.setScalar(s)
    if (!frame.reduced) sway.current += frame.dt
    const swayY = frame.reduced ? 0 : Math.sin(sway.current * 0.5) * 0.22
    const hoverY = frame.reduced ? 0 : frame.pointer.x * 0.32
    g.rotation.set(frame.reduced ? 0 : -frame.pointer.y * 0.06, swayY + hoverY + turn, 0)
    uniforms.uFade.value = frame.handoff * fade
    lid.opacity = frame.handoff * fade
    lid.envMapIntensity = 0.8
  })

  return (
    <group ref={group} visible={false}>
      <group ref={inner}>
        <mesh geometry={parts.body} material={body} renderOrder={10} castShadow />
        <mesh geometry={parts.lid} material={lid} renderOrder={10} />
        <mesh geometry={parts.tab} material={lid} renderOrder={10} />
        <mesh geometry={parts.rivet} material={lid} renderOrder={10} />
      </group>
    </group>
  )
}

/* ---------- the closing line-up: every variant at once ---------- */

function RackCan({ id, index, total, textures }: { id: string; index: number; total: number; textures: Record<string, Entry> }) {
  const { parts, uniforms, body, lid } = useProductCan()
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const applied = useRef(false)

  useFrame((state) => {
    const g = group.current!
    if (!applied.current && textures[id]) {
      apply(uniforms, textures[id], inner.current!)
      applied.current = true
    }
    const f = frame.finale
    g.visible = f > 0.01 && applied.current
    if (!g.visible) return
    const aspect = state.size.width / state.size.height
    const portrait = aspect < 0.85
    // Arc centred on the camera axis; portrait screens get two tighter rows.
    let x: number
    let z: number
    let row = 0
    if (portrait) {
      const perRow = Math.ceil(total / 2)
      row = index < perRow ? 0 : 1
      const i = row === 0 ? index : index - perRow
      const n = row === 0 ? perRow : total - perRow
      const a = ((i - (n - 1) / 2) / Math.max(1, n - 1)) * 1.5
      const R = row === 0 ? 1.55 : 1.85
      x = Math.sin(a) * R
      z = -2.9 - row * 1.2 + Math.cos(a) * R * 0.55 - R * 0.55
    } else {
      // Narrower frames get a tighter, deeper arc so no can is clipped at the edges.
      const fit = Math.min(1, aspect / 1.75)
      const a = ((index - (total - 1) / 2) / (total - 1)) * 1.7 * (0.8 + 0.2 * fit)
      const R = 3.6 * fit
      x = Math.sin(a) * R
      z = -6.1 + Math.cos(a) * R
    }
    const delay = (Math.abs(index - (total - 1) / 2) / total) * 0.55
    // Rises only once the closing headline owns the screen.
    const k = smoother(segment(f, 0.42 + delay * 0.6, 0.78 + delay * 0.6))
    const baseY = portrait ? -0.45 + row * 0.5 : -1.0
    g.position.set(X_REVEAL + x, baseY - (1 - k) * 2.2, z)
    const sc = portrait ? 0.5 : 0.7
    g.scale.setScalar(sc)
    const time = frame.reduced ? 0 : frame.time
    g.rotation.set(0, Math.atan2(-x, 3.55 - z) + Math.sin(time * 0.4 + index) * 0.08, 0)
    uniforms.uFade.value = smooth(k)
    lid.opacity = smooth(k)
  })

  return (
    <group ref={group} visible={false}>
      <group ref={inner}>
        <mesh geometry={parts.body} material={body} />
        <mesh geometry={parts.lid} material={lid} />
        <mesh geometry={parts.tab} material={lid} />
      </group>
    </group>
  )
}

/** Mounted from the start (so its program is warmed with the rest); fills in as textures land. */
export function Rack() {
  // Small cans on a phone: the 250 px render is already at or above screen density.
  const textures = useProductTextures(!tier.low)
  return (
    <>
      {PRODUCTS.map((p, i) => (
        <RackCan key={p.id} id={p.id} index={i} total={PRODUCTS.length} textures={textures} />
      ))}
    </>
  )
}
