import * as THREE from 'three'
import type { CanState, Mood } from './timeline'

/**
 * Per-frame state resolved once by the Director and read by every scene part.
 * Mutable singleton: no React state on the hot path.
 */
export const frame = {
  t: 0,
  bridge: 0,
  catalog: 0,
  finale: 0,
  time: 0,
  dt: 0,
  mobile: false,
  reduced: false,
  /** 0..1 how far the journey can has handed over to the catalog slot. */
  handoff: 0,
  can: {
    visible: true,
    form: 5,
    dissolve: 0,
    printBase: 1,
    printClaw: 1,
    printWord: 1,
    lid: 1,
    lidSpin: 0,
    wet: 1,
    spin: 0,
  } as CanState,
  canPos: new THREE.Vector3(),
  canRot: new THREE.Euler(),
  canScale: 1,
  mood: { env: 1, envRot: -1.1, key: 1, rim: 1, haze: 1, cool: 0, dark: 0, metal: 0, sweep: -2, sweepAmt: 0 } as Mood,
  /** Slot pose for the catalog can (world), resolved from the DOM. */
  slot: { pos: new THREE.Vector3(), height: 1, visible: false },
  /** Atmosphere palette, eased toward the current target. */
  colorA: new THREE.Color('#8fe03a'),
  colorB: new THREE.Color('#2c5a12'),
  /** 0..1 how much the four line colours split the light during the hand-off. */
  split: 0,
  pointer: new THREE.Vector2(),
}

export const LINE_COLORS = ['#8fe03a', '#e4ebf1', '#e0a63e', '#ffb020'].map((c) => new THREE.Color(c))
