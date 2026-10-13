import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frame } from '../frame'
import { BED_Y, FLOOR_Y, S, X_FILL, X_LID, X_PRESS, X_REVEAL, local, smooth } from '../timeline'
import { segment } from '@/data/stations'
import { steel } from './Press'

/**
 * Station 05: rails, light gates, the filling nozzle and the seaming head.
 * The can rides the rails (its pose comes from the timeline); the stream only
 * runs while the can is parked under the nozzle.
 */

const streamVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`
const streamFrag = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uTime; uniform float uFlow; uniform vec3 uColor;
void main(){
  float y = vUv.y;
  if (y > uFlow) discard;
  float rib = 0.5 + 0.5 * sin((y * 38.0 + uTime * 14.0) + sin(vUv.x * 6.2831 * 3.0) * 0.6);
  float fres = pow(1.0 - abs(dot(vN, vV)), 2.0);
  vec3 c = uColor * (0.55 + rib * 0.35) + vec3(1.0) * fres * 0.9;
  gl_FragColor = vec4(c * 1.6, 0.85);
}`

export function FillLine() {
  const group = useRef<THREE.Group>(null)
  const stream = useRef<THREE.Mesh>(null)
  const head = useRef<THREE.Group>(null)
  const gateRefs = useRef<THREE.MeshBasicMaterial[]>([])

  const mats = useMemo(
    () => ({
      steel: steel(),
      rail: new THREE.MeshPhysicalMaterial({ color: '#9aa1a7', metalness: 1, roughness: 0.18, clearcoat: 0.6 }),
      dark: new THREE.MeshPhysicalMaterial({ color: '#1d2125', metalness: 0.85, roughness: 0.45 }),
      stream: new THREE.ShaderMaterial({
        vertexShader: streamVert,
        fragmentShader: streamFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uColor: { value: new THREE.Color('#b9e84a') } },
      }),
    }),
    [],
  )
  const gates = useMemo(() => {
    const xs: number[] = []
    for (let x = X_PRESS + 1.1; x < X_REVEAL - 0.6; x += 1.15) if (Math.abs(x - X_FILL) > 0.5 && Math.abs(x - X_LID) > 0.5) xs.push(x)
    return xs
  }, [])
  const rollers = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 16)
    geo.rotateX(Math.PI / 2)
    const count = Math.floor((X_REVEAL - X_PRESS) / 0.16)
    const m = new THREE.InstancedMesh(geo, mats.rail, count)
    const d = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      d.position.set(X_PRESS + 0.4 + i * 0.16, BED_Y - 0.035, 0)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.receiveShadow = true
    return m
  }, [mats.rail])

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose())
      rollers.geometry.dispose()
      rollers.dispose()
    },
    [mats, rollers],
  )

  useFrame(() => {
    const t = frame.t
    const g = group.current!
    const live = t > S.identidade.start + 0.05 && t < S.revelacao.start + 0.08 && frame.catalog < 0.5
    g.visible = live
    if (!live) return
    const fill = local(t, 'envase', 0.2, 0.44)
    const flow = Math.min(smooth(segment(fill, 0, 0.25)), 1 - smooth(segment(fill, 0.8, 1)))
    const s = stream.current!
    s.visible = flow > 0.001
    mats.stream.uniforms.uFlow.value = flow
    mats.stream.uniforms.uTime.value = frame.time
    // Seaming head follows the lid down.
    const lid = frame.can.lid
    head.current!.position.set(X_LID, BED_Y + 1.62 + (1 - lid) * 1.6, 0)
    head.current!.visible = t > S.envase.start
    // Gates flare as the can passes through them.
    gates.forEach((x, i) => {
      const d = Math.abs(frame.canPos.x - x)
      const m = gateRefs.current[i]
      if (m) m.color.setRGB(0.56, 1, 0.24).multiplyScalar(0.35 + Math.max(0, 1 - d / 0.6) * 4.5)
    })
    const env = frame.mood.env
    mats.steel.envMapIntensity = env
    mats.rail.envMapIntensity = env
  })

  const length = X_REVEAL - X_PRESS + 0.6
  const midX = (X_REVEAL + X_PRESS) / 2

  return (
    <group ref={group}>
      {[-0.28, 0.28].map((z) => (
        <mesh key={z} position={[midX, BED_Y - 0.03, z]} material={mats.rail} castShadow receiveShadow>
          <boxGeometry args={[length, 0.05, 0.05]} />
        </mesh>
      ))}
      <mesh position={[midX, (BED_Y + FLOOR_Y) / 2 - 0.05, 0]} material={mats.dark} receiveShadow>
        <boxGeometry args={[length, BED_Y - FLOOR_Y - 0.1, 0.5]} />
      </mesh>
      <primitive object={rollers} />
      {gates.map((x, i) => (
        <group key={x} position={[x, BED_Y, 0]}>
          {[-0.62, 0.62].map((z) => (
            <mesh key={z} position={[0, 0.8, z]} material={mats.dark}>
              <boxGeometry args={[0.07, 1.6, 0.07]} />
            </mesh>
          ))}
          <mesh position={[0, 1.6, 0]} material={mats.dark}>
            <boxGeometry args={[0.1, 0.08, 1.32]} />
          </mesh>
          <mesh position={[0, 1.555, 0]}>
            <boxGeometry args={[0.04, 0.012, 1.18]} />
            <meshBasicMaterial ref={(m) => void (m && (gateRefs.current[i] = m))} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* filling nozzle */}
      <group position={[X_FILL, BED_Y, 0]}>
        <mesh position={[0, 2.75, 0]} material={mats.steel} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.9, 48]} />
        </mesh>
        <mesh position={[0, 2.22, 0]} material={mats.steel}>
          <cylinderGeometry args={[0.05, 0.09, 0.2, 32]} />
        </mesh>

        <group position={[0, 2.12, 0]} rotation={[Math.PI, 0, 0]}>
          {/* uv.y runs from the nozzle (0) down to the can opening (1) */}
          <mesh ref={stream} position={[0, 0.295, 0]} material={mats.stream}>
            <cylinderGeometry args={[0.04, 0.032, 0.59, 24, 24, true]} />
          </mesh>
        </group>
      </group>
      {/* seaming head */}
      <group ref={head}>
        <mesh position={[0, 0.35, 0]} material={mats.steel} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 48]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} material={mats.dark}>
          <cylinderGeometry args={[0.1, 0.1, 1.6, 24]} />
        </mesh>
      </group>
    </group>
  )
}
