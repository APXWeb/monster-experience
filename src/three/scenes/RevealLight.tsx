import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frame } from '../frame'
import { X_REVEAL, local, smooth } from '../timeline'

/**
 * The reveal's light blade: a tall slit of light far behind the can that opens as
 * the room goes dark, silhouetting the metal, plus its line on the floor.
 */
const frag = /* glsl */ `
varying vec2 vUv; uniform float uOpen; uniform vec3 uColor; uniform float uGain;
void main(){
  float x = abs(vUv.x - 0.5) * 2.0;
  float core = exp(-x * x * 900.0);
  float halo = exp(-x * x * 28.0) * 0.16;
  float v = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  float open = smoothstep(abs(vUv.y - 0.45) * 2.2, abs(vUv.y - 0.45) * 2.2 + 0.2, uOpen * 1.4);
  vec3 c = mix(uColor, vec3(1.0), core * 0.85) * (core * 3.2 + halo) * v * open;
  gl_FragColor = vec4(c * uGain, 1.0);
}`
const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

export function RevealLight() {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uOpen: { value: 0 }, uColor: { value: new THREE.Color() }, uGain: { value: 1 } },
      }),
    [],
  )
  useFrame(() => {
    const open = smooth(local(frame.t, 'revelacao', 0.08, 0.5)) * (1 - frame.catalog)
    mesh.current!.visible = open > 0.001
    mat.uniforms.uOpen.value = open
    mat.uniforms.uColor.value.copy(frame.colorA)
    mat.uniforms.uGain.value = (frame.mobile ? 0.35 : 0.6) * (0.55 + frame.mood.sweepAmt * 0.45)
    // The source of the sweep: it travels behind the can with the band on the metal.
    const restX = frame.mood.sweep < -1 ? frame.mood.sweep : frame.mood.sweep * 0.25
    mesh.current!.position.x = X_REVEAL + THREE.MathUtils.clamp(restX, -1.6, 1.6) * (frame.mobile ? 0.55 : 0.85)
  })
  return (
    <mesh ref={mesh} position={[X_REVEAL + 0.95, 1.0, -3.2]} material={mat} renderOrder={2}>
      <planeGeometry args={[3.2, 6.5]} />
    </mesh>
  )
}
