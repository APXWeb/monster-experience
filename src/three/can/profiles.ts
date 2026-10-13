/**
 * Can body profiles. Units: 1 = 100 mm. A 473 ml can is ~66 mm wide and ~157 mm tall,
 * so the finished body has radius 0.33 and the seam sits at ~1.57.
 *
 * Every profile is a polyline from the bottom centre (r = 0) outward and up to the
 * open rim, resampled to the same number of points by arc length. Because point i of
 * one profile corresponds to point i of every other, the forming sequence is a plain
 * per-point interpolation: disc -> cup -> redraw -> ironed wall -> dome -> neck.
 */

export const CAN_R = 0.33
export const CAN_H = 1.572
export const LABEL_Y0 = 0.095
export const LABEL_Y1 = 1.4
export const K = 120

export type P2 = [number, number]

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P2[] {
  const out: P2[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

/** Flat-bottomed cup: bottom, rounded corner, straight wall. */
function cup(R: number, H: number, corner: number, lip = 0): P2[] {
  const pts: P2[] = [[0, 0]]
  pts.push([R - corner, 0])
  pts.push(...arc(R - corner, corner, corner, -Math.PI / 2, 0, 10).slice(1))
  pts.push([R, H])
  if (lip > 0) pts.push([R + lip, H + lip * 0.25])
  return pts
}

/** Finished body (open, before the end is seamed on): domed base, chime, wall, neck, flange. */
function finished(): P2[] {
  return [
    [0, 0.082],
    [0.08, 0.079],
    [0.15, 0.068],
    [0.2, 0.048],
    [0.232, 0.022],
    [0.244, 0.006],
    [0.252, 0.0],
    [0.262, 0.003],
    [0.285, 0.016],
    [0.307, 0.035],
    [0.322, 0.058],
    [0.329, 0.078],
    [CAN_R, 0.095],
    [CAN_R, 0.6],
    [CAN_R, 1.38],
    [0.329, 1.398],
    [0.322, 1.42],
    [0.31, 1.444],
    [0.296, 1.468],
    [0.285, 1.488],
    [0.279, 1.503],
    [0.277, 1.515],
    [0.278, 1.524],
    [0.286, 1.532],
  ]
}

/** Same as the finished body but before necking: straight wall to the rim. */
function domed(): P2[] {
  const f = finished().filter(([, y]) => y <= 1.38)
  f.push([CAN_R, 1.5], [CAN_R + 0.004, 1.532])
  return f
}

export function resample(pts: P2[], n = K): P2[] {
  const seg: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dy = pts[i][1] - pts[i - 1][1]
    seg.push(seg[i - 1] + Math.hypot(dx, dy))
  }
  const total = seg[seg.length - 1]
  const out: P2[] = []
  let j = 1
  for (let i = 0; i < n; i++) {
    const s = (total * i) / (n - 1)
    while (j < seg.length - 1 && seg[j] < s) j++
    const t = (s - seg[j - 1]) / Math.max(1e-9, seg[j] - seg[j - 1])
    out.push([
      pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t,
      pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t,
    ])
  }
  return out
}

/** Forming stages in order. Index 5 is the finished body. */
export const STAGES: P2[][] = [
  resample(cup(0.64, 0.0001, 0.0001)).map(([r]) => [r, 0] as P2), // blank disc
  resample(cup(0.47, 0.34, 0.07, 0.03)), // cupped
  resample(cup(0.375, 0.78, 0.05, 0.02)), // redrawn
  resample(cup(CAN_R, 1.5, 0.03, 0.004)), // ironed wall
  resample(domed()), // domed base + trimmed
  resample(finished()), // necked + flanged
]

export const STAGE_COUNT = STAGES.length

/** Interpolate the profile at forming value m in [0, STAGE_COUNT - 1]. */
export function profileAt(m: number, out: P2[]) {
  const i = Math.max(0, Math.min(STAGE_COUNT - 2, Math.floor(m)))
  const t = Math.max(0, Math.min(1, m - i))
  const a = STAGES[i]
  const b = STAGES[i + 1]
  for (let k = 0; k < K; k++) {
    out[k][0] = a[k][0] + (b[k][0] - a[k][0]) * t
    out[k][1] = a[k][1] + (b[k][1] - a[k][1]) * t
  }
  return out
}

/** The seamed end (lid): panel, countersink, chuck wall and the double seam. */
export const LID_PROFILE: P2[] = [
  [0, 1.531],
  [0.12, 1.531],
  [0.19, 1.529],
  [0.222, 1.524],
  [0.232, 1.512],
  [0.24, 1.506],
  [0.249, 1.512],
  [0.256, 1.54],
  [0.262, 1.562],
  [0.27, 1.572],
  [0.281, 1.572],
  [0.289, 1.564],
  [0.29, 1.548],
  [0.287, 1.532],
  [0.28, 1.522],
]
