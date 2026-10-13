import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frame } from '../frame'
import { BED_Y, BLANK, FLOOR_Y, S, STRIKES, X_PRESS, local, lerp, smooth, smoother } from '../timeline'
import { segment } from '@/data/stations'

/**
 * Station 03 tooling. A brushed strip feeds in, the blanking punch cuts the disc
 * (the disc is the journey can itself, at forming value 0), then each strike drives
 * the draw punch while the die ring follows the metal.
 */

export const steel = () =>
  new THREE.MeshPhysicalMaterial({ color: '#b9c0c6', metalness: 1, roughness: 0.3, anisotropy: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4 })

/** How far the strip (and the disc riding on it) has travelled; 0 = disc centred on the die. */
export function stripOffset(t: number) {
  const s = local(t, 'formacao')
  const enter = smoother(segment(s, 0.0, BLANK.a))
  const leave = smoother(segment(s, BLANK.b, BLANK.b + 0.14))
  return { disc: (1 - enter) * 3.2, strip: (1 - enter) * 3.2 - leave * 4.2 }
}

/** Punch travel for a strike window: down before it, holds through it, retracts after. */
function strokeAt(s: number, a: number, b: number) {
  const down = smoother(segment(s, a - 0.035, a + 0.01))
  const up = smoother(segment(s, b, b + 0.035))
  return down * (1 - up)
}

export function Press() {
  const group = useRef<THREE.Group>(null)
  const strip = useRef<THREE.Mesh>(null)
  const blankPunch = useRef<THREE.Mesh>(null)
  const drawPunch = useRef<THREE.Group>(null)
  const die = useRef<THREE.Mesh>(null)
  const neckDie = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Mesh>(null)

  const mats = useMemo(
    () => ({
      steel: steel(),
      dark: new THREE.MeshPhysicalMaterial({ color: '#2a2f33', metalness: 0.9, roughness: 0.5 }),
      sheet: new THREE.MeshPhysicalMaterial({ color: '#e8edf0', metalness: 1, roughness: 0.3, anisotropy: 0.7, side: THREE.DoubleSide }),
      glow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dff3c').multiplyScalar(4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dff3c').multiplyScalar(0.55) }),
    }),
    [],
  )
  const geos = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.6, -0.75)
    shape.lineTo(1.6, -0.75)
    shape.lineTo(1.6, 0.75)
    shape.lineTo(-1.6, 0.75)
    shape.lineTo(-1.6, -0.75)
    const hole = new THREE.Path()
    hole.absarc(0, 0, 0.64, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const stripGeo = new THREE.ShapeGeometry(shape, 64)
    stripGeo.rotateX(-Math.PI / 2)
    // Die ring: rectangular section around the wall.
    const dieGeo = new THREE.LatheGeometry(
      [new THREE.Vector2(1.0, 0), new THREE.Vector2(1.18, 0), new THREE.Vector2(1.18, 0.16), new THREE.Vector2(1.0, 0.16), new THREE.Vector2(1.0, 0)],
      72,
    )
    const neckGeo = new THREE.LatheGeometry(
      [new THREE.Vector2(0.27, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0.4, 0.3), new THREE.Vector2(0.335, 0.3), new THREE.Vector2(0.278, 0.12), new THREE.Vector2(0.27, 0)],
      72,
    )
    return { stripGeo, dieGeo, neckGeo }
  }, [])

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose())
      Object.values(geos).forEach((g) => g.dispose())
    },
    [mats, geos],
  )

  useFrame(() => {
    const t = frame.t
    const g = group.current!
    const live = t > S.formulacao.start + 0.1 && t < S.envase.start + 0.06
    g.visible = live
    if (!live) return
    const s = local(t, 'formacao')
    const off = stripOffset(t)

    strip.current!.position.set(X_PRESS + off.strip, BED_Y + 0.009, 0)
    strip.current!.visible = s > 0 && s < BLANK.b + 0.15

    // Blanking punch: one heavy stroke.
    const bk = strokeAt(s, BLANK.a + 0.02, BLANK.b - 0.03)
    blankPunch.current!.position.set(X_PRESS, lerp(BED_Y + 2.3, BED_Y + 0.6, bk), 0)

    // Draw punch: strokes through each strike, sized to the cup it is drawing.
    let dk = 0
    for (const k of STRIKES.slice(0, 4)) dk = Math.max(dk, strokeAt(s, k.a, k.b))
    const wall = wallAt(frame.can.form)
    const punchBottom = lerp(BED_Y + 2.6, BED_Y + 0.06, dk)
    drawPunch.current!.position.set(X_PRESS, punchBottom, 0)
    drawPunch.current!.scale.set(Math.max(0.2, wall.r - 0.012), 1, Math.max(0.2, wall.r - 0.012))
    drawPunch.current!.visible = s > BLANK.b - 0.02 && s < 0.86

    // Die ring rides at the rim of the wall while drawing, then drops away.
    const dieOut = smooth(segment(s, 0.82, 0.9)) + smooth(local(t, 'identidade', 0, 0.1))
    die.current!.position.set(X_PRESS, BED_Y + Math.max(0.0, wall.h - 0.14) - dieOut * 0.5, 0)
    die.current!.scale.set(wall.r + 0.01, 1, wall.r + 0.01)
    die.current!.visible = s > BLANK.b && dieOut < 0.99

    // Necking die comes down for the last strike.
    const nk = strokeAt(s, STRIKES[4].a, STRIKES[4].b)
    neckDie.current!.position.set(X_PRESS, lerp(BED_Y + 3.0, BED_Y + 1.4, nk), 0)
    neckDie.current!.visible = s > 0.78 && s < 1

    // A short ring of light at each impact.
    let hit = 0
    for (const k of [{ a: BLANK.a + 0.02 }, ...STRIKES]) {
      const x = segment(s, k.a + 0.008, k.a + 0.05)
      hit = Math.max(hit, Math.sin(Math.PI * x) * (x > 0 && x < 1 ? 1 : 0))
    }
    const f = flash.current!
    f.visible = hit > 0.01
    f.position.set(X_PRESS, BED_Y + 0.01, 0)
    f.scale.setScalar(0.6 + hit * 0.6)
    mats.glow.opacity = hit * 0.7

    const env = frame.mood.env * (1 + frame.mood.metal * 0.9)
    mats.steel.envMapIntensity = env
    mats.sheet.envMapIntensity = env
  })

  return (
    <group ref={group}>
      {/* bed */}
      <mesh position={[X_PRESS, (BED_Y + FLOOR_Y) / 2 - 0.001, 0]} material={mats.dark} receiveShadow castShadow>
        <boxGeometry args={[2.6, BED_Y - FLOOR_Y, 1.8]} />
      </mesh>
      <mesh position={[X_PRESS, BED_Y - 0.012, 0]} material={mats.steel} receiveShadow>
        <cylinderGeometry args={[0.86, 0.9, 0.02, 72]} />
      </mesh>
      {/* frame columns and crosshead */}
      {[-1.55, 1.55].map((dx) => (
        <mesh key={dx} position={[X_PRESS + dx, 1.2, -0.75]} material={mats.dark} castShadow>
          <boxGeometry args={[0.32, 4.8, 0.42]} />
        </mesh>
      ))}
      <mesh position={[X_PRESS, 3.25, -0.4]} material={mats.dark}>
        <boxGeometry args={[3.5, 0.7, 1.2]} />
      </mesh>
      {/* one lamp only, on the far column, so no light bar crosses the copy column */}
      {[1.55].map((dx) => (
        <mesh key={`l${dx}`} position={[X_PRESS + dx, 0.6, -0.53]} material={mats.lamp}>
          <boxGeometry args={[0.03, 2.2, 0.01]} />
        </mesh>
      ))}
      <mesh ref={strip} geometry={geos.stripGeo} material={mats.sheet} receiveShadow castShadow />
      <mesh ref={blankPunch} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.645, 0.645, 1.2, 72]} />
      </mesh>
      {/* unit radius, scaled to the current cup; bottom face at the group origin */}
      <group ref={drawPunch}>
        <mesh position={[0, 1.6, 0]} material={mats.steel} castShadow>
          <cylinderGeometry args={[1, 1, 3.2, 72]} />
        </mesh>
      </group>
      <mesh ref={die} geometry={geos.dieGeo} material={mats.steel} castShadow receiveShadow />
      <mesh ref={neckDie} geometry={geos.neckGeo} material={mats.steel} castShadow />
      <mesh ref={flash} rotation={[-Math.PI / 2, 0, 0]} material={mats.glow}>
        <ringGeometry args={[0.66, 0.7, 96]} />
      </mesh>
    </group>
  )
}

/** Wall radius and rim height for a forming value (mirrors the lathe without touching it). */
const WALLS = [
  { r: 0.64, h: 0.0 },
  { r: 0.5, h: 0.37 },
  { r: 0.395, h: 0.8 },
  { r: 0.334, h: 1.5 },
  { r: 0.334, h: 1.53 },
  { r: 0.33, h: 1.53 },
]
function wallAt(m: number) {
  const i = Math.max(0, Math.min(4, Math.floor(m)))
  const t = Math.max(0, Math.min(1, m - i))
  return { r: lerp(WALLS[i].r, WALLS[i + 1].r, t), h: lerp(WALLS[i].h, WALLS[i + 1].h, t) }
}
