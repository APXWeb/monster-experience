import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frame, LINE_COLORS } from '../frame'
import { FLOOR_Y } from '../timeline'

/**
 * Backdrop, haze, dust and floor. The backdrop is a screen-space quad drawn first:
 * a deep graphite field with a rising glow in the current palette. During the
 * hand-off to the catalog the glow splits into the four line colours.
 */

const bgVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`

const bgFrag = /* glsl */ `
varying vec2 vUv;
uniform vec3 uA; uniform vec3 uB; uniform float uAspect; uniform float uTime; uniform float uHaze; uniform float uDark;
uniform float uSplit; uniform vec3 uL0; uniform vec3 uL1; uniform vec3 uL2; uniform vec3 uL3; uniform vec2 uFocus;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float glow(vec2 p, vec2 c, vec2 s){ vec2 d = (p - c) / s; return exp(-dot(d, d)); }
void main(){
  vec2 p = vUv; vec2 q = vec2((p.x - 0.5) * uAspect, p.y);
  vec3 col = vec3(0.012, 0.016, 0.015);
  // graphite falloff toward the top
  col += vec3(0.02, 0.024, 0.023) * smoothstep(1.1, 0.0, p.y);
  // rising volumetric glow behind the subject
  vec2 f = vec2((uFocus.x - 0.5) * uAspect, uFocus.y);
  float g = glow(q, f + vec2(0.0, -0.32), vec2(0.62, 0.55));
  float g2 = glow(q, f + vec2(-0.25, -0.62), vec2(1.1, 0.32));
  float breathe = 0.92 + 0.08 * sin(uTime * 0.4);
  vec3 glowCol = mix(uB, uA, 0.55);
  col += glowCol * (g * 0.11 + g2 * 0.045) * uHaze * breathe * (1.0 - uDark * 0.8);
  // split light into the four lines
  if (uSplit > 0.001) {
    float w = uAspect * 0.95;
    vec3 L = vec3(0.0);
    L += uL0 * glow(q, vec2(-w * 0.42, 0.18), vec2(0.18, 0.75));
    L += uL1 * glow(q, vec2(-w * 0.14, 0.18), vec2(0.18, 0.75));
    L += uL2 * glow(q, vec2( w * 0.14, 0.18), vec2(0.18, 0.75));
    L += uL3 * glow(q, vec2( w * 0.42, 0.18), vec2(0.18, 0.75));
    col += L * 0.2 * uSplit;
  }
  // vignette + dither
  float v = smoothstep(1.25, 0.25, length((p - 0.5) * vec2(uAspect * 0.9, 1.15)));
  col *= mix(0.45, 1.0, v) * (1.0 - uDark * 0.45);
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

export function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: bgVert,
        fragmentShader: bgFrag,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uA: { value: new THREE.Color() },
          uB: { value: new THREE.Color() },
          uAspect: { value: 1 },
          uTime: { value: 0 },
          uHaze: { value: 1 },
          uDark: { value: 0 },
          uSplit: { value: 0 },
          uFocus: { value: new THREE.Vector2(0.62, 0.5) },
          uL0: { value: LINE_COLORS[0] },
          uL1: { value: LINE_COLORS[1] },
          uL2: { value: LINE_COLORS[2] },
          uL3: { value: LINE_COLORS[3] },
        },
      }),
    [],
  )
  const focus = useRef(new THREE.Vector2(0.62, 0.5))
  useFrame((state) => {
    const u = mat.uniforms
    u.uA.value.copy(frame.colorA)
    u.uB.value.copy(frame.colorB)
    u.uAspect.value = state.size.width / state.size.height
    u.uTime.value = frame.reduced ? 0 : frame.time
    u.uHaze.value = frame.mood.haze
    u.uDark.value = frame.mood.dark
    u.uSplit.value = frame.split
    // Glow follows the can on screen.
    const p = frame.canPos.clone()
    p.y += 0.8 * frame.canScale
    p.project(state.camera)
    focus.current.lerp(new THREE.Vector2(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5), 1 - Math.exp(-frame.dt * 4))
    u.uFocus.value.copy(focus.current)
  })
  return (
    <mesh frustumCulled={false} renderOrder={-1000} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

/** Fine suspended dust lit in the palette; gives every station real parallax. */
export function Dust({ count = 900 }: { count?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3] = -4 + Math.random() * 24
      p[i * 3 + 1] = -1.1 + Math.random() * 4
      p[i * 3 + 2] = -5 + Math.random() * 8
      s[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1))
    return g
  }, [count])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uPx: { value: 1 }, uAmt: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTime; uniform float uPx; varying float vA;
          void main(){
            vec3 p = position;
            p.y += mod(uTime * (0.02 + aSeed * 0.05) + aSeed * 4.0, 4.0) - 2.0;
            p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.08;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float size = (0.6 + aSeed * 1.8) * uPx;
            gl_PointSize = size * (6.0 / -mv.z);
            vA = smoothstep(14.0, 2.0, -mv.z) * smoothstep(0.3, 1.2, -mv.z) * (0.35 + aSeed * 0.65);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uAmt; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(mix(vec3(1.0), uColor, 0.4) * a * vA * 0.4 * uAmt, 1.0);
          }`,
      }),
    [],
  )
  useFrame((state) => {
    mat.uniforms.uTime.value = frame.reduced ? 0 : frame.time
    mat.uniforms.uColor.value.copy(frame.colorA)
    mat.uniforms.uPx.value = state.viewport.dpr * 2.2
    mat.uniforms.uAmt.value = frame.mood.haze
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

/** Dark satin floor that fades out with distance, so it reads as ground, not as a plane. */
export function Floor() {
  const alpha = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 64
    const g = c.getContext('2d')!
    const grd = g.createLinearGradient(0, 0, 0, 64)
    grd.addColorStop(0, '#000')
    grd.addColorStop(0.35, '#fff')
    grd.addColorStop(0.7, '#fff')
    grd.addColorStop(1, '#000')
    g.fillStyle = grd
    g.fillRect(0, 0, 512, 64)
    const gx = g.createLinearGradient(0, 0, 512, 0)
    gx.addColorStop(0, 'rgba(0,0,0,1)')
    gx.addColorStop(0.08, 'rgba(0,0,0,0)')
    gx.addColorStop(0.92, 'rgba(0,0,0,0)')
    gx.addColorStop(1, 'rgba(0,0,0,1)')
    g.fillStyle = gx
    g.fillRect(0, 0, 512, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0c0f0e',
        metalness: 0.75,
        roughness: 0.42,
        alphaMap: alpha,
        transparent: true,
        envMapIntensity: 0.6,
      }),
    [alpha],
  )
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(() => {
    mat.envMapIntensity = 0.6 * frame.mood.env
    mat.opacity = 1 - frame.catalog
    // Fully faded: drop it, or its depth would still clip the catalog can.
    mesh.current!.visible = mat.opacity > 0.01
    mat.depthWrite = mat.opacity > 0.98
  })
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[7, FLOOR_Y, -1.5]} material={mat} receiveShadow>
      <planeGeometry args={[30, 12]} />
    </mesh>
  )
}

/** Key, rim and fill lights, steered by the mood and the palette. */
export function Lights() {
  const key = useRef<THREE.SpotLight>(null)
  const rim = useRef<THREE.SpotLight>(null)
  const rim2 = useRef<THREE.SpotLight>(null)
  const keyTarget = useMemo(() => new THREE.Object3D(), [])
  const rimTarget = useMemo(() => new THREE.Object3D(), [])
  const cool = useMemo(() => new THREE.Color('#e8f0ff'), [])
  const warm = useMemo(() => new THREE.Color('#ffffff'), [])
  useFrame(() => {
    const p = frame.canPos
    keyTarget.position.set(p.x, p.y + 0.8 * frame.canScale, p.z)
    rimTarget.position.copy(keyTarget.position)
    const k = key.current!
    k.position.set(p.x - 2.6, p.y + 4.2, p.z + 3.2)
    k.intensity = 50 * (0.55 + frame.mood.key * 0.45) * (1 - frame.catalog * 0.35)
    k.color.copy(warm).lerp(cool, frame.mood.cool)
    const r = rim.current!
    // During the reveal the rim light travels across the back of the can.
    const sweep = frame.mood.envRot
    r.position.set(p.x + 2.4 + Math.sin(sweep) * 0.8, p.y + 2.2, p.z - 2.6)
    r.intensity = 16 * frame.mood.rim
    r.color.copy(frame.colorA).lerp(warm, 0.3 + frame.mood.dark * 0.5)
    const r2 = rim2.current!
    r2.position.set(p.x - 2.8, p.y + 1.2, p.z - 2.2)
    r2.intensity = 7 * frame.mood.rim
    r2.color.copy(frame.colorA).lerp(warm, 0.55)
  })
  return (
    <>
      <primitive object={keyTarget} />
      <primitive object={rimTarget} />
      <hemisphereLight args={['#c9d6cf', '#050605', 0.18]} />
      <spotLight
        ref={key}
        target={keyTarget}
        angle={0.42}
        penumbra={1}
        decay={2}
        distance={20}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <spotLight ref={rim} target={rimTarget} angle={0.5} penumbra={1} decay={2} distance={14} />
      <spotLight ref={rim2} target={rimTarget} angle={0.5} penumbra={1} decay={2} distance={14} />
    </>
  )
}
