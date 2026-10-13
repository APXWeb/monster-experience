import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { frame } from '../frame'
import { MorphLathe } from '../can/lathe'
import { canParts } from '../can/parts'
import { makeBodyMaterial, makeCanUniforms, makeMetalMaterial } from '../can/materials'
import { buildDroplets, buildLabel, type LabelLayers } from '../can/textures'
import { CAN_H } from '../can/profiles'
import { tier } from '../tier'

/**
 * The one can the journey follows: a lathe that is reshaped every frame while it is
 * being formed, printed in stages, filled and closed, then handed to the catalog.
 */
export function JourneyCan({ onReady }: { onReady?: () => void }) {
  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null)
  const lidGroup = useRef<THREE.Group>(null)
  const printRing = useRef<THREE.Mesh>(null)

  const lathe = useMemo(() => new MorphLathe(tier.low ? 72 : 128), [])
  const uniforms = useMemo(() => makeCanUniforms(), [])
  const droplets = useMemo(() => buildDroplets(), [])
  const parts = useMemo(() => canParts(), [])
  const body = useMemo(() => makeBodyMaterial(null, uniforms, droplets), [uniforms, droplets])
  const lidMat = useMemo(() => makeMetalMaterial(uniforms, '#c8ccd0', 0.42), [uniforms])
  const tabMat = useMemo(() => makeMetalMaterial(uniforms, '#9aa0a6', 0.3), [uniforms])
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#9dff3c').multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false }),
    [],
  )

  useEffect(() => {
    let alive = true
    let label: LabelLayers | null = null
    buildLabel(gl).then((l) => {
      if (!alive) return
      label = l
      const next = makeBodyMaterial(l, uniforms, droplets)
      const mesh = group.current?.getObjectByName('body') as THREE.Mesh | undefined
      if (mesh) {
        ;(mesh.material as THREE.Material).dispose()
        mesh.material = next
      }
      onReady?.()
    })
    return () => {
      alive = false
      label?.base.dispose()
      label?.graphics.dispose()
      label?.masks.dispose()
    }
  }, [gl, uniforms, droplets, onReady])

  useEffect(
    () => () => {
      lathe.dispose()
      body.dispose()
      lidMat.dispose()
      tabMat.dispose()
      droplets.dispose()
    },
    [lathe, body, lidMat, tabMat, droplets],
  )

  useFrame(() => {
    const g = group.current
    if (!g) return
    const c = frame.can
    const visible = c.visible && frame.handoff < 0.999
    g.visible = visible
    if (!visible) return

    g.position.copy(frame.canPos)
    g.rotation.copy(frame.canRot)
    g.scale.setScalar(frame.canScale)

    lathe.setForm(c.form)
    uniforms.uDissolve.value = c.dissolve
    uniforms.uPrintBase.value = c.printBase
    uniforms.uPrintClaw.value = c.printClaw
    uniforms.uPrintWord.value = c.printWord
    uniforms.uPrintGlow.value = 1

    const mesh = g.getObjectByName('body') as THREE.Mesh
    const mat = mesh.material as THREE.MeshPhysicalMaterial
    mat.normalScale.setScalar(c.wet * 0.55)
    // Raw drawn aluminium is satin and bright; the varnished, printed can is glossier.
    mat.roughness = 0.3 - c.printBase * 0.1 - c.wet * 0.03
    mat.envMapIntensity = frame.mood.env * 1.05 * (1 + frame.mood.metal * 0.9)
    uniforms.uSweep.value = frame.mood.sweep
    uniforms.uSweepAmt.value = frame.mood.sweepAmt

    // Lid descends onto the neck and gives a short seaming turn.
    const lid = lidGroup.current!
    lid.visible = c.lid > 0.001 && c.form > 4.98
    lid.position.y = (1 - c.lid) * 1.6
    lid.rotation.y = c.lidSpin * Math.PI * 3
    lidMat.envMapIntensity = frame.mood.env
    tabMat.envMapIntensity = frame.mood.env

    // Print head: a ring of light that rides up with the base coat.
    const ring = printRing.current!
    const pb = c.printBase
    const active = pb > 0.001 && pb < 0.999
    ring.visible = active
    if (active) {
      ring.position.y = THREE.MathUtils.clamp(pb * 1.08 - 0.02, 0, 1) * CAN_H
      ringMat.opacity = Math.sin(Math.PI * pb) * 0.9
    }
  })

  return (
    <group ref={group}>
      <mesh name="body" geometry={lathe.geometry} material={body} castShadow receiveShadow />
      <group ref={lidGroup}>
        <mesh geometry={parts.lid} material={lidMat} castShadow />
        <mesh geometry={parts.tab} material={tabMat} castShadow />
        <mesh geometry={parts.rivet} material={tabMat} />
        <mesh geometry={parts.score} material={tabMat} />
      </group>
      <mesh ref={printRing} material={ringMat} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.37, 0.006, 8, 96]} />
      </mesh>
    </group>
  )
}
