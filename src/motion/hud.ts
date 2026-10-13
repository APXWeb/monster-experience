/**
 * Screen-space anchors published by the 3D director each frame (CSS px), read by the
 * DOM overlay. Plain numbers only, so the DOM bundle never imports three.
 */
export interface Anchor {
  x: number
  y: number
  on: boolean
}

export const hud = {
  /** Forming value 0..5 at the press. */
  form: 0,
  /** Can anatomy points on the right silhouette of the can. */
  disc: { x: 0, y: 0, on: false } as Anchor,
  wall: { x: 0, y: 0, on: false } as Anchor,
  bottom: { x: 0, y: 0, on: false } as Anchor,
  neck: { x: 0, y: 0, on: false } as Anchor,
}
