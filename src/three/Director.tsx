import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll, motion } from '@/motion/scroll'
import { useStore } from '@/state/store'
import { productById } from '@/data/products'
import { STATIONS, segment } from '@/data/stations'
import { frame } from './frame'
import { CAMERA, CAN_TRACK, canState, moodAt, sample, smooth, smoother, X_REVEAL } from './timeline'
import { CAN_H } from './can/profiles'
import { stripOffset } from './scenes/Press'
import { hud, type Anchor } from '@/motion/hud'

const tmp: number[] = new Array(9).fill(0)
const camPos = new THREE.Vector3()
const camTarget = new THREE.Vector3()
const ndc = new THREE.Vector3()
const dir = new THREE.Vector3()
const targetA = new THREE.Color()
const targetB = new THREE.Color()
const pv = new THREE.Vector3()

/** Project a point on the can's right silhouette (local radius r, height y) to CSS px. */
function publish(a: Anchor, camera: THREE.Camera, w: number, h: number, r: number, y: number, on: boolean) {
  pv.set(frame.canPos.x + r * frame.canScale, frame.canPos.y + y * frame.canScale, frame.canPos.z).project(camera)
  a.x = (pv.x * 0.5 + 0.5) * w
  a.y = (-pv.y * 0.5 + 0.5) * h
  a.on = on && pv.z < 1
}

/** Hold poses for reduced motion: the camera rests on each station's composed frame. */
const HOLDS = [0, ...STATIONS.map((s) => s.start + (s.end - s.start) * 0.62), 1]

/**
 * Resolves the whole scene state for this frame from scroll + time, before any
 * scene part reads it (negative priority runs first).
 */
export function Director() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const smoothT = useRef(0)
  const look = useRef(new THREE.Vector3())
  const first = useRef(true)

  useEffect(() => {
    // Test hook for the review scripts.
    ;(window as unknown as { __frame: unknown }).__frame = { frame, camera }
  }, [camera])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      frame.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    frame.dt = dt
    frame.time += dt
    frame.mobile = size.width / size.height < 0.85
    frame.reduced = motion.reduced

    // Journey progress, lightly damped so wheel steps never read as jumps.
    const target = scroll.journey
    if (first.current) smoothT.current = target
    smoothT.current += (target - smoothT.current) * (1 - Math.exp(-dt * (motion.reduced ? 30 : 9)))
    const t = Math.abs(smoothT.current - target) < 1e-5 ? target : smoothT.current
    frame.t = t
    frame.bridge = scroll.bridge
    frame.finale = scroll.finale

    canState(t, frame.can)
    moodAt(t, frame.mood)

    /* camera */
    let camT = t
    if (motion.reduced) {
      let best = HOLDS[0]
      for (const h of HOLDS) if (Math.abs(h - t) < Math.abs(best - t)) best = h
      camT = best
    }
    sample(frame.mobile ? CAMERA.mobile : CAMERA.desktop, camT, tmp)
    camPos.set(tmp[0], tmp[1], tmp[2])
    camTarget.set(tmp[3], tmp[4], tmp[5])
    const fov = tmp[6]
    const shift = tmp[7]

    // Breath: a slow drift and pointer parallax, suppressed under reduced motion.
    if (!motion.reduced) {
      const k = 1 - smooth(segment(scroll.bridge, 0, 0.6)) * 0.5
      camPos.x += (Math.sin(frame.time * 0.21) * 0.05 + frame.pointer.x * 0.09) * k
      camPos.y += (Math.cos(frame.time * 0.17) * 0.035 + frame.pointer.y * 0.05) * k
    }

    if (first.current || !motion.reduced) {
      camera.position.copy(camPos)
      look.current.copy(camTarget)
    } else {
      const a = 1 - Math.exp(-dt * 9)
      camera.position.lerp(camPos, a)
      look.current.lerp(camTarget, a)
    }
    camera.lookAt(look.current)
    if (Math.abs(camera.fov - fov) > 1e-3) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    // Shift the subject sideways on wide frames without re-aiming the lens.
    const offset = -shift * camera.getFilmWidth()
    if (Math.abs(camera.filmOffset - offset) > 1e-4) {
      camera.filmOffset = offset
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()

    /* can along its path */
    sample(CAN_TRACK, t, tmp)
    frame.canPos.set(tmp[0], tmp[1], tmp[2])
    frame.canRot.set(tmp[3], frame.can.spin, tmp[4])
    frame.canScale = tmp[5]
    // The blank rides the strip in until it is cut.
    if (t >= STATIONS[2].start && t < STATIONS[3].start) frame.canPos.x += stripOffset(t).disc
    if (!motion.reduced && t < 0.08) {
      // Idle float on the hero can only; it settles before the dissolve so particles match.
      const idle = 1 - segment(t, 0.02, 0.06)
      frame.canPos.y += Math.sin(frame.time * 0.9) * 0.025 * idle
      frame.canRot.y += Math.sin(frame.time * 0.35) * 0.18 * idle
    }

    /* anatomy anchors for the press overlay */
    const pressOn = t > STATIONS[2].start && t < STATIONS[2].end
    const m = frame.can.form
    hud.form = pressOn ? m : 0
    publish(hud.disc, camera, size.width, size.height, 0.64, 0.0, pressOn && m < 0.6)
    publish(hud.wall, camera, size.width, size.height, 0.335, m >= 2.9 ? 0.85 : 0.5, pressOn && m >= 2.9)
    publish(hud.bottom, camera, size.width, size.height, 0.33, 0.2, pressOn && m >= 3.9)
    publish(hud.neck, camera, size.width, size.height, 0.29, 1.47, pressOn && m >= 4.9)

    /* catalog slot from the DOM */
    const slotEl = document.getElementById('can-slot')
    frame.slot.visible = false
    if (slotEl) {
      const r = slotEl.getBoundingClientRect()
      if (r.height > 0 && r.bottom > -r.height && r.top < size.height + r.height) {
        const cx = ((r.left + r.width / 2) / size.width) * 2 - 1
        const cy = -(((r.top + r.height / 2) / size.height) * 2 - 1)
        ndc.set(cx, cy, 0.5).unproject(camera)
        dir.copy(ndc).sub(camera.position).normalize()
        const dist = (0 - camera.position.z) / dir.z
        const center = camera.position.clone().addScaledVector(dir, dist)
        const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.abs(camera.position.z)
        const h = (r.height / size.height) * visibleH
        frame.slot.height = h
        frame.slot.pos.set(center.x, center.y - h / 2, 0)
        frame.slot.visible = true
      }
    }

    // Hand-off: the revealed can travels into the catalog slot.
    const b = smoother(segment(scroll.bridge, 0.0, 0.92))
    frame.catalog = b
    if (b > 0 && frame.slot.visible) {
      const s = frame.slot.height / CAN_H
      frame.canPos.lerp(frame.slot.pos, b)
      frame.canScale = THREE.MathUtils.lerp(frame.canScale, s, b)
      frame.canRot.z = THREE.MathUtils.lerp(frame.canRot.z, 0, b)
    } else if (b > 0) {
      frame.canPos.x = THREE.MathUtils.lerp(frame.canPos.x, X_REVEAL - 1, b)
    }
    frame.handoff = smooth(segment(scroll.bridge, 0.78, 0.98))
    frame.split = Math.sin(Math.PI * segment(scroll.bridge, 0.05, 0.95))

    /* atmosphere palette */
    const selected = productById(useStore.getState().selectedId)
    if (b > 0.5) {
      targetA.set(selected.colors.accent)
      targetB.set(selected.colors.deep)
    } else {
      targetA.set('#8fe03a')
      targetB.set(frame.mood.cool > 0.5 ? '#3d5a4c' : '#2c5a12')
    }
    const ca = 1 - Math.exp(-dt * 3.2)
    if (first.current) {
      frame.colorA.copy(targetA)
      frame.colorB.copy(targetB)
    } else {
      frame.colorA.lerp(targetA, ca)
      frame.colorB.lerp(targetB, ca)
    }
    first.current = false
  }, -10)

  return null
}
