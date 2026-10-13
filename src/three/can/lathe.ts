import * as THREE from 'three'
import { CAN_H, K, profileAt, STAGES, type P2 } from './profiles'

/**
 * A lathe whose profile can be rewritten every frame. UVs are fixed: u wraps the
 * circumference, v follows the height of the FINISHED profile point that each row
 * becomes, so the label lands correctly once the body is formed.
 */
export class MorphLathe {
  geometry: THREE.BufferGeometry
  private segments: number
  private profile: P2[]
  private m = -1

  constructor(segments = 128) {
    this.segments = segments
    this.profile = STAGES[0].map((p) => [p[0], p[1]] as P2)
    const verts = (segments + 1) * K
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(verts * 3)
    const uv = new Float32Array(verts * 2)
    const finished = STAGES[STAGES.length - 1]
    for (let s = 0; s <= segments; s++) {
      for (let k = 0; k < K; k++) {
        const i = s * K + k
        uv[i * 2] = s / segments
        uv[i * 2 + 1] = finished[k][1] / CAN_H
      }
    }
    const index: number[] = []
    for (let s = 0; s < segments; s++) {
      for (let k = 0; k < K - 1; k++) {
        const a = s * K + k
        const b = (s + 1) * K + k
        index.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    g.setIndex(index)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(verts * 3), 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    this.geometry = g
    this.setForm(STAGES.length - 1)
  }

  /** Rebuild positions for forming value m. Cheap enough to run every frame while forming. */
  setForm(m: number) {
    if (Math.abs(m - this.m) < 1e-5) return
    this.m = m
    profileAt(m, this.profile)
    const pos = this.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let s = 0; s <= this.segments; s++) {
      // u = 0.5 faces +z (the camera side), so the texture seam sits at the back.
      const a = (s / this.segments - 0.5) * Math.PI * 2
      const c = Math.cos(a)
      const sn = Math.sin(a)
      for (let k = 0; k < K; k++) {
        const [r, y] = this.profile[k]
        const i = (s * K + k) * 3
        arr[i] = sn * r
        arr[i + 1] = y
        arr[i + 2] = c * r
      }
    }
    pos.needsUpdate = true
    this.geometry.computeVertexNormals()
    // Seam the normals across u = 0 / u = 1 so the wrap has no lighting crease.
    const n = this.geometry.attributes.normal as THREE.BufferAttribute
    const na = n.array as Float32Array
    const last = this.segments * K
    for (let k = 0; k < K; k++) {
      for (let c = 0; c < 3; c++) {
        const v = (na[k * 3 + c] + na[(last + k) * 3 + c]) * 0.5
        na[k * 3 + c] = v
        na[(last + k) * 3 + c] = v
      }
    }
    n.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }

  /** Current outer radius at the top of the profile (rim), used by tooling. */
  rim(): P2 {
    return this.profile[K - 1]
  }

  /** Radius and height of the wall at its widest point. */
  wall(): { r: number; h: number } {
    let r = 0
    for (const p of this.profile) r = Math.max(r, p[0])
    return { r, h: this.profile[K - 1][1] }
  }

  dispose() {
    this.geometry.dispose()
  }
}

/** Static lathe from a profile (lid, tooling). */
export function lathe(profile: P2[], segments = 96) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  )
}
