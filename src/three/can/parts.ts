import * as THREE from 'three'
import { lathe } from './lathe'
import { LID_PROFILE, STAGES, type P2 } from './profiles'

/** Shared static geometries for the lid assembly and the finished body. */

let cache: {
  lid: THREE.BufferGeometry
  tab: THREE.BufferGeometry
  rivet: THREE.BufferGeometry
  score: THREE.BufferGeometry
  body: THREE.BufferGeometry
} | null = null

function tabShape() {
  // Stay-on tab seen from above: rounded nose over the opening, finger ring at the back.
  const s = new THREE.Shape()
  const w = 0.062
  s.moveTo(-w, -0.07)
  s.lineTo(-w, 0.07)
  s.absarc(0, 0.07, w, Math.PI, 0, true)
  s.lineTo(w, -0.07)
  s.absarc(0, -0.07, w, 0, Math.PI, true)
  const hole = new THREE.Path()
  hole.absellipse(0, -0.068, 0.04, 0.03, 0, Math.PI * 2, false, 0)
  s.holes.push(hole)
  const rivetHole = new THREE.Path()
  rivetHole.absarc(0, 0.035, 0.008, 0, Math.PI * 2, false)
  s.holes.push(rivetHole)
  return s
}

export function canParts() {
  if (cache) return cache
  const lid = lathe(LID_PROFILE, 96)
  lid.computeVertexNormals()

  const tab = new THREE.ExtrudeGeometry(tabShape(), {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 24,
  })
  // Lay the tab flat on the panel, nose over the opening.
  tab.rotateX(Math.PI / 2)
  tab.translate(0, 1.541, -0.035)

  const rivet = new THREE.CylinderGeometry(0.014, 0.016, 0.008, 24)
  rivet.translate(0, 1.536, 0)

  // Score line of the opening: a teardrop groove in front of the rivet.
  const curve = new THREE.CatmullRomCurve3(
    [
      [0.0, 0.045],
      [0.052, 0.07],
      [0.07, 0.12],
      [0.05, 0.168],
      [0.0, 0.182],
      [-0.05, 0.168],
      [-0.07, 0.12],
      [-0.052, 0.07],
    ].map(([x, z]) => new THREE.Vector3(x, 1.5315, z)),
    true,
  )
  const score = new THREE.TubeGeometry(curve, 80, 0.0028, 6, true)

  const body = lathe(STAGES[STAGES.length - 1] as P2[], 128)
  body.computeVertexNormals()

  cache = { lid, tab, rivet, score, body }
  return cache
}
