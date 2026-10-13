import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { useStore } from '@/state/store'
import { frame } from './frame'
import { Director } from './Director'
import { buildEnvironment } from './env'
import { Backdrop, Dust, Floor, Lights } from './scenes/Atmosphere'
import { JourneyCan } from './scenes/JourneyCan'
import { Droplets, Lab, LiquidBody } from './scenes/Origin'
import { Press } from './scenes/Press'
import { FillLine } from './scenes/FillLine'
import { CatalogCan, Rack } from './scenes/Catalog3D'
import { RevealLight } from './scenes/RevealLight'
import { tier } from './tier'
import { Precompile } from './Precompile'

const finishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uGrain: { value: 0.035 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAspect; uniform float uGrain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d * vec2(uAspect, 1.0), d * vec2(uAspect, 1.0));
      // whisper of lateral chroma toward the frame edge
      vec2 off = d * r2 * 0.0025;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + off).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - off).b;
      c *= 1.0 - smoothstep(0.35, 1.45, r2) * 0.55;
      c += (hash(vUv * 1024.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }`,
}

function Post({ onWarm }: { onWarm: () => void }) {
  const { gl, scene, camera, size, viewport } = useThree()
  const composer = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.low ? 0 : 4 })
    const c = new EffectComposer(gl, rt)
    c.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 2.2)
    c.addPass(bloom)
    c.addPass(new OutputPass())
    const fin = new ShaderPass(finishShader)
    c.addPass(fin)
    return { c, bloom, fin }
  }, [gl, scene, camera])

  useEffect(() => {
    composer.c.setPixelRatio(viewport.dpr)
    composer.c.setSize(size.width, size.height)
    composer.bloom.resolution.set(size.width / 2, size.height / 2)
  }, [composer, size, viewport.dpr])

  useEffect(() => () => composer.c.dispose(), [composer])
  const [target, setTarget] = useState<THREE.WebGLRenderTarget | null>(null)
  useEffect(() => setTarget(composer.c.readBuffer), [composer, size])

  useFrame(() => {
    composer.fin.uniforms.uTime.value = frame.reduced ? 0 : frame.time % 10
    composer.fin.uniforms.uAspect.value = size.width / size.height
    composer.bloom.strength = 0.32 + frame.mood.dark * 0.1
    composer.c.render(frame.dt)
  }, 1)
  return target ? <Precompile onDone={onWarm} target={target} /> : null
}

function Environment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const rt = buildEnvironment(gl)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])
  useFrame(() => {
    scene.environmentRotation.set(0, frame.mood.envRot, 0)
    scene.environmentIntensity = frame.mood.env
  })
  return null
}

/** Halves the pixel ratio when frames run long, restores it when they are fast again. */
function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr)
  const samples = useRef<number[]>([])
  const dpr = useRef(Math.min(window.devicePixelRatio, tier.maxDpr))
  const cool = useRef(0)
  useFrame((_, dt) => {
    samples.current.push(dt)
    if (samples.current.length < 90) return
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length
    samples.current = []
    cool.current--
    if (cool.current > 0) return
    if (avg > 1 / 42 && dpr.current > 0.75) {
      dpr.current = Math.max(0.75, dpr.current - 0.25)
      setDpr(dpr.current)
      cool.current = 2
    } else if (avg < 1 / 58 && dpr.current < Math.min(window.devicePixelRatio, tier.maxDpr)) {
      dpr.current = Math.min(tier.maxDpr, dpr.current + 0.25)
      setDpr(dpr.current)
      cool.current = 4
    }
  })
  return null
}

function Scene() {
  const setStageReady = useStore((s) => s.setStageReady)
  // Ready once the label is composed AND every program is compiled.
  const pending = useRef(2)
  const onReady = useCallback(() => {
    pending.current -= 1
    if (pending.current <= 0) setStageReady()
  }, [setStageReady])
  const rich = !tier.low
  return (
    <>
      <Director />
      <Environment />
      <Backdrop />
      <Lights />
      <Floor />
      <Dust count={rich ? 900 : 380} />
      <JourneyCan onReady={onReady} />
      <Droplets count={rich ? 700 : 300} rich={rich} />
      <LiquidBody resolution={rich ? 44 : 28} rich={rich} />
      <Lab rich={rich} />
      <Press />
      <FillLine />
      <RevealLight />
      <CatalogCan />
      <Rack />
      <AdaptiveDpr />
      <Post onWarm={onReady} />
    </>
  )
}

export default function Stage() {
  const setGl = useStore((s) => s.setGl)
  return (
    <Canvas
      className="stage-canvas"
      aria-hidden="true"
      dpr={[1, Math.min(window.devicePixelRatio, tier.maxDpr)]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 30, near: 0.05, far: 60, position: [0, 0, 4] }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1.0
        setGl('ok')
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          setGl('off')
        })
      }}
    >
      <Scene />
    </Canvas>
  )
}
