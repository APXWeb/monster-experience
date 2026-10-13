import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { frame } from '../frame'
import { local, smooth, smoother, lerp, BED_Y } from '../timeline'
import { CAN_R } from '../can/profiles'
import { segment } from '@/data/stations'

/**
 * Stations 01 and 02. The hero can dissolves into droplets that gather into a
 * liquid body and three ordered orbits; then glass vessels rise around it and the
 * liquid is distributed into them while measuring rings draw themselves.
 */

export const liquidMaterial = (rich: boolean) =>
  new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c6f04a'),
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transmission: rich ? 0.82 : 0,
    thickness: 0.6,
    ior: 1.34,
    attenuationColor: new THREE.Color('#6fae12'),
    attenuationDistance: 0.6,
    emissive: new THREE.Color('#3a6a06'),
    emissiveIntensity: rich ? 0.25 : 0.55,
    transparent: !rich,
    opacity: rich ? 1 : 0.92,
  })

/** Vessel layout around the origin: x, z, radius, height, kind. */
export const VESSELS = [
  { x: 0, z: 0, r: 0.42, h: 1.05, kind: 'beaker' as const },
  { x: -1.15, z: -0.45, r: 0.26, h: 1.5, kind: 'tube' as const },
  { x: 1.2, z: -0.3, r: 0.36, h: 0.95, kind: 'flask' as const },
  { x: -0.62, z: 0.55, r: 0.2, h: 0.7, kind: 'beaker' as const },
  { x: 0.78, z: 0.62, r: 0.16, h: 1.15, kind: 'tube' as const },
]

const RING_ORBITS = [
  { r: 0.95, tilt: [0.35, 0, 0.2] },
  { r: 1.28, tilt: [-0.5, 0, -0.35] },
  { r: 1.62, tilt: [1.2, 0, 0.1] },
]

interface Drop {
  from: THREE.Vector3
  ctrl: THREE.Vector3
  orbit: number
  phase: number
  emit: number
  size: number
  vessel: number
  intoBlob: boolean
}

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

export function Droplets({ count = 700, rich = true }: { count?: number; rich?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const mat = useMemo(() => liquidMaterial(rich), [rich])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), [])
  const drops = useMemo<Drop[]>(() => {
    const list: Drop[] = []
    for (let i = 0; i < count; i++) {
      // Sampled on the hero can's surface in its settled pose (base at y = -0.78).
      const a = hash(i + 1) * Math.PI * 2
      const y = 0.12 + hash(i + 7) * 1.32
      const from = new THREE.Vector3(Math.sin(a) * CAN_R, y - 0.78, Math.cos(a) * CAN_R)
      const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
      const ctrl = from.clone().addScaledVector(out, 0.5 + hash(i + 3) * 0.7).add(new THREE.Vector3(0, (hash(i + 9) - 0.4) * 0.8, 0))
      list.push({
        from,
        ctrl,
        orbit: i % 3,
        phase: (i / count) * Math.PI * 2 * 7 + hash(i + 11) * 0.2,
        emit: hash(i + 13) * 0.75,
        size: 0.012 + Math.pow(hash(i + 17), 3) * 0.05,
        vessel: 1 + (i % 4),
        intoBlob: hash(i + 19) < 0.28,
      })
    }
    return list
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), e: new THREE.Euler() }), [])

  useEffect(() => () => {
    geo.dispose()
    mat.dispose()
  }, [geo, mat])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const t = frame.t
    const live = t > 0.06 && t < 0.4
    m.visible = live
    if (!live) return
    const dis = frame.can.dissolve
    const gather = local(t, 'origem', 0.15, 0.7)
    const pour = local(t, 'formulacao', 0.3, 0.78)
    const time = frame.reduced ? 0 : frame.time
    const spin = time * 0.12 + local(t, 'origem') * 1.4
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      // Leave the surface as the surface there dissolves.
      const k = smoother(segment(dis * 1.25 + gather * 0.6, d.emit, d.emit + 0.55))
      // Ordered target: an orbit slot, or the liquid body.
      const o = RING_ORBITS[d.orbit]
      const ang = d.phase + spin * (d.orbit % 2 ? -1 : 1)
      if (d.intoBlob) v.b.set(Math.cos(ang) * 0.18, Math.sin(ang * 1.3) * 0.18, Math.sin(ang) * 0.18)
      else {
        v.b.set(Math.cos(ang) * o.r, 0, Math.sin(ang) * o.r)
        v.e.set(o.tilt[0], o.tilt[1], o.tilt[2])
        v.b.applyEuler(v.e)
      }
      // Quadratic bezier from surface through the outward control point.
      const u = k
      v.a.copy(d.from).multiplyScalar((1 - u) * (1 - u))
      v.a.addScaledVector(d.ctrl, 2 * (1 - u) * u)
      v.a.addScaledVector(v.b, u * u)
      let s = d.size * (0.35 + k * 0.65)
      if (d.intoBlob) s *= 1 - smooth(segment(gather, 0.5, 1))
      // Station 02: drops stream into the side vessels and vanish into the liquid.
      if (pour > 0 && !d.intoBlob) {
        const ves = VESSELS[d.vessel]
        const pk = smoother(segment(pour, (d.phase % 1) * 0.4, (d.phase % 1) * 0.4 + 0.6))
        v.c.set(ves.x, BED_Y + ves.h * 0.55, ves.z)
        v.a.lerp(v.c, pk)
        s *= 1 - smooth(segment(pk, 0.7, 1))
      }
      dummy.position.copy(v.a)
      dummy.scale.setScalar(Math.max(0.0001, s))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, count]} frustumCulled={false} castShadow />
}

/** The liquid body: metaballs that gather, breathe, then sink into the main vessel. */
export function LiquidBody({ resolution = 44, rich = true }: { resolution?: number; rich?: boolean }) {
  const mat = useMemo(() => liquidMaterial(rich), [rich])
  const mc = useMemo(() => {
    const m = new MarchingCubes(resolution, mat, false, false, 60000)
    m.isolation = 60
    return m
  }, [resolution, mat])
  useEffect(() => () => {
    mc.geometry.dispose()
    mat.dispose()
  }, [mc, mat])

  useFrame(() => {
    const t = frame.t
    const grow = smooth(local(t, 'origem', 0.18, 0.7))
    const sink = smoother(local(t, 'formulacao', 0.25, 0.75))
    const live = t > 0.07 && t < 0.38 && grow > 0.001
    mc.visible = live
    if (!live) return
    const time = frame.reduced ? 0 : frame.time
    const vol = grow * (1 - sink * 0.55)
    const size = lerp(0.95, 0.55, sink)
    mc.scale.setScalar(size)
    mc.position.set(0, lerp(0.02, BED_Y + 0.42, sink), 0)
    mc.reset()
    const n = 7
    for (let i = 0; i < n; i++) {
      const ph = i * 1.7
      const amp = 0.17 * (1 - sink * 0.7)
      const x = 0.5 + Math.sin(time * 0.53 + ph) * amp * Math.cos(time * 0.21 + i)
      const y = 0.5 + Math.cos(time * 0.41 + ph * 1.3) * amp
      const z = 0.5 + Math.sin(time * 0.37 + ph * 0.7) * amp
      mc.addBall(x, y, z, 0.42 * vol + 0.0001, 12)
    }
    mc.update()
  })
  return <primitive object={mc} castShadow />
}

/* ---------------- lab ---------------- */

function vesselProfile(kind: 'beaker' | 'tube' | 'flask', r: number, h: number): THREE.Vector2[] {
  const P = (x: number, y: number) => new THREE.Vector2(x, y)
  const w = 0.012
  if (kind === 'flask') {
    return [P(0, 0), P(r * 0.95, 0), P(r, 0.03), P(r * 0.98, h * 0.35), P(r * 0.42, h * 0.78), P(r * 0.36, h), P(r * 0.36 + w, h + 0.01), P(r * 0.36 - w * 0.5, h + 0.02), P(r * 0.36 - w, h * 0.78), P(r * 0.98 - w, h * 0.35), P(r * 0.95 - w, w), P(0, w)]
  }
  return [P(0, 0), P(r * 0.96, 0), P(r, 0.03), P(r, h), P(r + w, h + 0.012), P(r - w * 0.4, h + 0.02), P(r - w, h), P(r - w, w + 0.02), P(r * 0.96 - w, w), P(0, w)]
}

const ringVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const ringFrag = /* glsl */ `
varying vec2 vUv; uniform float uDraw; uniform vec3 uColor; uniform float uTicks;
void main(){
  float a = vUv.x;
  if (a > uDraw) discard;
  float tick = step(0.82, fract(a * uTicks));
  float alpha = mix(0.55, 1.0, tick) * smoothstep(uDraw, uDraw - 0.02, a);
  gl_FragColor = vec4(uColor * (1.6 + tick * 1.4), alpha);
}`

/** A circle drawn as a band along its own length (uv.x = angle), with tick marks. */
function ringGeometry(r: number, w: number, seg = 160) {
  const g = new THREE.BufferGeometry()
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    for (const k of [0, 1]) {
      const rr = r + (k - 0.5) * w
      pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr)
      uv.push(i / seg, k)
    }
    if (i < seg) {
      const b = i * 2
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
    }
  }
  g.setIndex(idx)
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return g
}

/**
 * Lab glass, drawn as light rather than refraction: fresnel edges, a vertical
 * specular streak and a faint tint, added over the scene. Reads as clean glass
 * against the dark set on every device, with no transmission pass.
 */
function glassMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTint: { value: new THREE.Color('#bfe6c9') }, uAmt: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vVN;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint; uniform float uAmt; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
        float f = pow(1.0 - abs(dot(n, vV)), 3.0);
        float streak = smoothstep(0.55, 0.62, n.x) * (1.0 - smoothstep(0.7, 0.78, n.x));
        float streak2 = smoothstep(-0.88, -0.84, n.x) * (1.0 - smoothstep(-0.8, -0.76, n.x));
        vec3 c = uTint * (0.025 + f * 0.75) + vec3(1.0) * (streak * 0.55 + streak2 * 0.25);
        gl_FragColor = vec4(c * uAmt * (gl_FrontFacing ? 1.0 : 0.45), 1.0);
      }`,
  })
}

export function Lab(_: { rich?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const glass = useMemo(() => glassMaterial(), [])
  const liquid = useMemo(() => liquidMaterial(false), [])
  const vesselGeos = useMemo(
    () => VESSELS.map((v) => new THREE.LatheGeometry(vesselProfile(v.kind, v.r, v.h), 64)),
    [],
  )
  const fillGeos = useMemo(
    () =>
      VESSELS.map((v) => {
        const g = new THREE.CylinderGeometry(v.r * (v.kind === 'flask' ? 0.92 : 0.94), v.r * (v.kind === 'flask' ? 0.92 : 0.94), 1, 48)
        g.translate(0, 0.5, 0)
        return g
      }),
    [],
  )
  const rings = useMemo(
    () =>
      [0.62, 0.9, 1.55, 2.05].map((r, i) => {
        const m = new THREE.ShaderMaterial({
          vertexShader: ringVert,
          fragmentShader: ringFrag,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: { uDraw: { value: 0 }, uColor: { value: new THREE.Color('#9dff3c') }, uTicks: { value: [48, 72, 120, 160][i] } },
        })
        return { geo: ringGeometry(r, i % 2 ? 0.006 : 0.004), mat: m, r }
      }),
    [],
  )
  const ringRefs = useRef<THREE.Mesh[]>([])
  const vesselRefs = useRef<THREE.Group[]>([])
  const fillRefs = useRef<THREE.Mesh[]>([])
  const scan = useRef<THREE.Mesh>(null)

  useEffect(
    () => () => {
      glass.dispose()
      liquid.dispose()
      vesselGeos.forEach((g) => g.dispose())
      fillGeos.forEach((g) => g.dispose())
      rings.forEach((r) => {
        r.geo.dispose()
        r.mat.dispose()
      })
    },
    [glass, liquid, vesselGeos, fillGeos, rings],
  )

  useFrame(() => {
    const t = frame.t
    const g = group.current!
    const live = t > 0.18 && t < 0.47
    g.visible = live
    if (!live) return
    const rise = local(t, 'formulacao', 0.0, 0.38)
    const fill = local(t, 'formulacao', 0.35, 0.92)
    const exit = local(t, 'formacao', 0, 0.12)
    VESSELS.forEach((v, i) => {
      const vg = vesselRefs.current[i]
      const k = smoother(segment(rise, i * 0.09, i * 0.09 + 0.55))
      vg.position.set(v.x, lerp(BED_Y - v.h - 0.6, BED_Y, k), v.z)
      vg.visible = k > 0.001
      const f = fillRefs.current[i]
      const level = (i === 0 ? smoother(segment(fill, 0.0, 0.7)) : smoother(segment(fill, 0.1 + i * 0.06, 0.85))) * (i === 0 ? 0.6 : 0.42 + i * 0.05)
      f.scale.set(1, Math.max(0.001, v.h * level), 1)
      f.visible = level > 0.002
    })
    rings.forEach((r, i) => {
      const k = smoother(segment(local(t, 'formulacao', 0.32, 0.86), i * 0.12, i * 0.12 + 0.55))
      r.mat.uniforms.uDraw.value = k * (1 - exit)
      const mesh = ringRefs.current[i]
      mesh.rotation.y = (frame.reduced ? 0 : frame.time * (i % 2 ? -0.05 : 0.04)) + i
      mesh.position.y = BED_Y + 0.02 + i * 0.004
    })
    const s = scan.current!
    const sk = local(t, 'formulacao', 0.45, 0.95)
    s.visible = sk > 0 && sk < 1
    s.position.y = BED_Y + sk * 1.6
    ;(s.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * sk) * 0.8
  })

  return (
    <group ref={group}>
      {VESSELS.map((_, i) => (
        <group key={i} ref={(el) => void (el && (vesselRefs.current[i] = el))}>
          <mesh geometry={vesselGeos[i]} material={glass} castShadow />
          <mesh ref={(el) => void (el && (fillRefs.current[i] = el))} geometry={fillGeos[i]} material={liquid} position={[0, 0.014, 0]} />
        </group>
      ))}
      {rings.map((r, i) => (
        <mesh key={i} ref={(el) => void (el && (ringRefs.current[i] = el))} geometry={r.geo} material={r.mat} renderOrder={5} />
      ))}
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <ringGeometry args={[1.86, 1.875, 160, 1]} />
        <meshBasicMaterial color={new THREE.Color('#9dff3c').multiplyScalar(2.5)} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
