import { HERO_END, STATIONS, clamp01, segment } from '@/data/stations'

/**
 * The director's score. Everything the 3D scene shows during the journey is a pure
 * function of the journey progress `t` (0..1), so scrolling back replays the film in
 * reverse frame by frame. Per-frame idle motion (time) is layered on top elsewhere
 * and always fades to zero while a transformation is under way.
 *
 * World layout (x axis is the production line):
 *   x = 0   origin station: droplets, then the lab
 *   x = 7   press: the disc is drawn into a can, then printed
 *   x = 7..14  filling line
 *   x = 14  reveal, and the catalog stage afterwards
 */

export type V3 = [number, number, number]

export const FLOOR_Y = -1.2
export const BED_Y = -0.78
export const X_PRESS = 7
export const X_FILL = 9.6
export const X_LID = 11.9
export const X_REVEAL = 14

export const S = Object.fromEntries(STATIONS.map((s) => [s.id, s])) as Record<string, (typeof STATIONS)[number]>

export const smooth = (x: number) => x * x * (3 - 2 * x)
export const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeIn = (x: number) => x * x * x

/** Local progress inside a station, with optional sub-window. */
export const local = (t: number, id: string, a = 0, b = 1) => {
  const st = S[id]
  return segment(segment(t, st.start, st.end), a, b)
}

/* ---------- monotone cubic keyframes (no overshoot, flat holds stay flat) ---------- */

export interface Track {
  t: number[]
  v: number[][]
  m: number[][]
}

export function track(keys: [number, ...number[]][]): Track {
  const t = keys.map((k) => k[0])
  const v = keys.map((k) => k.slice(1) as number[])
  const dims = v[0].length
  const m: number[][] = v.map(() => new Array(dims).fill(0))
  for (let d = 0; d < dims; d++) {
    const n = t.length
    const delta: number[] = []
    for (let i = 0; i < n - 1; i++) delta.push((v[i + 1][d] - v[i][d]) / Math.max(1e-6, t[i + 1] - t[i]))
    for (let i = 0; i < n; i++) {
      if (i === 0) m[i][d] = delta[0] ?? 0
      else if (i === n - 1) m[i][d] = delta[n - 2] ?? 0
      else m[i][d] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2
    }
    for (let i = 0; i < n - 1; i++) {
      if (delta[i] === 0) {
        m[i][d] = 0
        m[i + 1][d] = 0
        continue
      }
      const a = m[i][d] / delta[i]
      const b = m[i + 1][d] / delta[i]
      const h = a * a + b * b
      if (h > 9) {
        const s = 3 / Math.sqrt(h)
        m[i][d] = s * a * delta[i]
        m[i + 1][d] = s * b * delta[i]
      }
    }
  }
  return { t, v, m }
}

export function sample(tr: Track, x: number, out: number[]) {
  const { t, v, m } = tr
  const n = t.length
  if (x <= t[0]) {
    for (let d = 0; d < out.length; d++) out[d] = v[0][d]
    return out
  }
  if (x >= t[n - 1]) {
    for (let d = 0; d < out.length; d++) out[d] = v[n - 1][d]
    return out
  }
  let i = 0
  while (i < n - 2 && x > t[i + 1]) i++
  const h = t[i + 1] - t[i]
  const s = (x - t[i]) / h
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  for (let d = 0; d < out.length; d++) {
    out[d] = h00 * v[i][d] + h10 * h * m[i][d] + h01 * v[i + 1][d] + h11 * h * m[i + 1][d]
  }
  return out
}

/* ---------- station anchors in t ---------- */

const st = (id: string, f: number) => lerp(S[id].start, S[id].end, f)

/* ---------- the camera path ---------- */
// [t, posX, posY, posZ, targetX, targetY, targetZ, fov, shift]
// Targets aim at the subject; `shift` slides the subject right on wide screens
// (fraction of the frame width) so copy can live on the left without re-aiming.
const CAM_DESKTOP: [number, ...number[]][] = [
  [0, 0.25, 0.12, 4.1, 0, 0.02, 0, 30, 0.2],
  [HERO_END, 0.22, 0.1, 3.95, 0, 0.02, 0, 30, 0.2],
  [st('origem', 0.35), 0.45, 0.25, 3.7, 0, 0.05, 0, 32, 0.16],
  [st('origem', 0.75), 0.7, 0.32, 3.2, 0, 0.05, 0, 32, 0.14],
  [st('origem', 1), 0.75, 0.4, 3.15, 0, 0.0, 0, 32, 0.14],
  [st('formulacao', 0.4), 1.0, 1.15, 5.1, 0.1, -0.35, 0, 34, 0.07],
  [st('formulacao', 0.82), 1.15, 1.3, 5.4, 0.12, -0.4, 0, 34, 0.07],
  [st('formacao', 0.0), 4.4, 1.35, 4.9, 4.4, -0.4, 0, 34, 0.12],
  [st('formacao', 0.14), 7.9, 0.25, 4.5, 7.0, -0.55, 0, 34, 0.14],
  [st('formacao', 0.4), 7.95, 0.3, 4.4, 7.0, -0.45, 0, 34, 0.14],
  [st('formacao', 0.75), 8.2, 1.15, 4.2, 7.0, -0.05, 0, 34, 0.14],
  [st('formacao', 1), 8.25, 1.1, 4.3, 7.0, 0.0, 0, 34, 0.14],
  [st('identidade', 0.25), 7.8, 0.55, 3.2, 7.0, 0.05, 0, 32, 0.15],
  [st('identidade', 0.85), 7.6, 0.4, 3.0, 7.0, 0.1, 0, 32, 0.15],
  [st('identidade', 1), 7.65, 0.45, 3.2, 7.0, 0.0, 0, 32, 0.14],
  [st('envase', 0.08), 8.4, 0.9, 4.1, 7.6, -0.15, 0, 36, 0.1],
  [st('envase', 0.3), X_FILL + 0.75, 0.85, 4.0, X_FILL, 0.1, 0, 36, 0.1],
  [st('envase', 0.45), X_FILL + 1.0, 0.8, 4.0, X_FILL + 0.3, 0.05, 0, 36, 0.1],
  [st('envase', 0.6), X_LID + 0.65, 0.85, 3.9, X_LID, 0.05, 0, 36, 0.1],
  [st('envase', 0.75), X_LID + 0.95, 0.8, 3.9, X_LID + 0.3, 0.0, 0, 36, 0.1],
  [st('envase', 1), X_REVEAL + 0.5, 0.6, 4.4, X_REVEAL, 0.0, 0, 34, 0.04],
  [st('revelacao', 0.22), X_REVEAL + 0.35, 0.28, 2.35, X_REVEAL, 0.12, 0, 30, 0],
  [st('revelacao', 0.42), X_REVEAL + 0.15, 0.22, 2.45, X_REVEAL, 0.1, 0, 30, 0],
  [st('revelacao', 0.8), X_REVEAL + 0.05, 0.02, 3.55, X_REVEAL, 0.05, 0, 30, 0],
  [1, X_REVEAL + 0.05, 0.02, 3.55, X_REVEAL, 0.05, 0, 30, 0],
]

// Portrait: subject centred and a little high (copy sits low), wider lens, farther back.
const CAM_MOBILE: [number, ...number[]][] = CAM_DESKTOP.map((k) => {
  const [t, px, py, pz, tx, ty, tz, fov] = k as number[]
  const end = t > lerp(S.revelacao.start, S.revelacao.end, 0.8) - 1e-6
  const back = end ? 1.02 : 1.3
  return [t, tx + (px - tx) * 0.6, py, tz + (pz - tz) * back, tx, ty + (end ? 0.12 : -0.28), tz, fov + 14, 0]
})

export const CAMERA = { desktop: track(CAM_DESKTOP), mobile: track(CAM_MOBILE) }

/* ---------- the can's path ---------- */
// [t, x, y(base), z, rotX, rotZ, scale]
const CAN_KEYS: [number, ...number[]][] = [
  [0, 0, -0.78, 0, 0.0, -0.14, 1],
  [HERO_END, 0, -0.78, 0, 0.0, -0.1, 1],
  [st('origem', 0.3), 0, -0.78, 0, 0, -0.04, 1],
  // hidden while liquid; reappears as the blank on the strip
  [st('formacao', 0.0), X_PRESS, BED_Y + 0.009, 0, 0, 0, 1],
  [st('formacao', 0.3), X_PRESS, BED_Y + 0.003, 0, 0, 0, 1],
  [st('identidade', 0.08), X_PRESS, BED_Y + 0.003, 0, 0, 0, 1],
  [st('identidade', 0.22), X_PRESS, BED_Y + 0.12, 0, 0, 0, 1],
  [st('identidade', 0.92), X_PRESS, BED_Y + 0.12, 0, 0, 0, 1],
  [st('envase', 0.05), X_PRESS + 0.4, BED_Y + 0.0, 0, 0, 0, 1],
  [st('envase', 0.22), X_FILL, BED_Y, 0, 0, 0, 1],
  [st('envase', 0.42), X_FILL, BED_Y, 0, 0, 0, 1],
  [st('envase', 0.52), X_LID, BED_Y, 0, 0, 0, 1],
  [st('envase', 0.72), X_LID, BED_Y, 0, 0, 0, 1],
  [st('envase', 0.95), X_REVEAL, BED_Y, 0, 0, 0, 1],
  [st('revelacao', 0.3), X_REVEAL, -0.76, 0, 0, 0, 1],
  [1, X_REVEAL, -0.74, 0, 0, 0, 1],
]
export const CAN_TRACK = track(CAN_KEYS)

/* ---------- everything else, as named scalar functions of t ---------- */

/** Forming value 0..5 along the press strikes. */
export const STRIKES = [
  { from: 0, to: 1, a: 0.3, b: 0.4 }, // cupping
  { from: 1, to: 2, a: 0.44, b: 0.54 }, // redraw
  { from: 2, to: 3, a: 0.58, b: 0.7 }, // ironing
  { from: 3, to: 4, a: 0.74, b: 0.81 }, // doming
  { from: 4, to: 5, a: 0.85, b: 0.95 }, // necking
]
export const BLANK = { a: 0.16, b: 0.26 }

export function formAt(t: number) {
  if (t < S.formacao.start) return 5
  if (t >= S.formacao.end) return 5
  const s = segment(t, S.formacao.start, S.formacao.end)
  // Strikes are sequential: each one adds its own step of forming.
  let m = 0
  for (const k of STRIKES) m += (k.to - k.from) * smoother(segment(s, k.a, k.b))
  return m
}

/** Which forming step label is active (for the UI list). */
export function stepIndex(t: number, id: string, edges: number[]) {
  const s = local(t, id)
  let i = 0
  while (i < edges.length && s >= edges[i]) i++
  return Math.max(0, i - 1)
}

export const FORM_STEP_EDGES = [0, BLANK.b + 0.02, STRIKES[1].a - 0.02, STRIKES[2].a - 0.02, STRIKES[3].a - 0.02, STRIKES[4].a - 0.02]
export const PRINT = { base: [0.06, 0.38], claw: [0.4, 0.7], word: [0.68, 0.88] }
export const PRINT_STEP_EDGES = [0, PRINT.claw[0], PRINT.word[0]]
export const LINE_STEP_EDGES = [0, 0.16, 0.45]

export interface CanState {
  visible: boolean
  form: number
  dissolve: number
  printBase: number
  printClaw: number
  printWord: number
  lid: number
  lidSpin: number
  wet: number
  spin: number
}

export function canState(t: number, out: CanState) {
  const o = S.origem
  const dissolve = smooth(segment(t, o.start + 0.004, lerp(o.start, o.end, 0.4)))
  const inJourneyHero = t < o.end
  const inMaking = t >= S.formacao.start
  out.dissolve = inJourneyHero ? dissolve : 0
  out.visible = (inJourneyHero && dissolve < 0.999) || inMaking
  out.form = inMaking ? formAt(t) : 5

  const made = t >= S.identidade.start
  const pi = (k: keyof typeof PRINT) => smoother(local(t, 'identidade', PRINT[k][0], PRINT[k][1]))
  out.printBase = !inMaking ? 1 : made ? pi('base') : 0
  out.printClaw = !inMaking ? 1 : made ? pi('claw') : 0
  out.printWord = !inMaking ? 1 : made ? pi('word') : 0

  // Lid: on in the hero, off while making, descends at the lid station.
  const lidIn = smoother(local(t, 'envase', 0.52, 0.64))
  out.lid = !inMaking ? 1 : t >= S.envase.start ? lidIn : 0
  out.lidSpin = local(t, 'envase', 0.6, 0.72)

  // Condensation: present on the finished hero can and again at the reveal.
  out.wet = !inMaking ? 1 : smooth(local(t, 'revelacao', 0.12, 0.55))

  // Scroll-driven turn of the can, in radians.
  const heroTurn = segment(t, 0, lerp(o.start, o.end, 0.4)) * 0.9
  const printTurn = smoother(local(t, 'identidade', 0.04, 0.4)) * Math.PI * 2 + local(t, 'identidade', 0.4, 1) * 0.35 - 0.35 * smooth(local(t, 'envase', 0, 0.3))
  // Front held through the close-up, then one slow turn while the camera pulls back.
  const revealTurn = smoother(local(t, 'revelacao', 0.42, 0.72)) * Math.PI * 2
  out.spin = inMaking ? printTurn + revealTurn : heroTurn
  return out
}

/** Journey-wide lighting and atmosphere scalars. */
export interface Mood {
  env: number
  envRot: number
  key: number
  rim: number
  haze: number
  /** 0 = acid green line light, 1 = cool white industrial light. */
  cool: number
  dark: number
  /** 0..1 extra studio light on bare metal at the press. */
  metal: number
  sweep: number
  sweepAmt: number
}

export function moodAt(t: number, out: Mood) {
  const lab = local(t, 'formulacao', 0.1, 0.6)
  const press = local(t, 'formacao', 0, 0.3)
  const reveal = local(t, 'revelacao')
  out.cool = clamp01(smooth(lab) * 0.7 + smooth(press) * 0.3 - smooth(local(t, 'envase', 0.6, 1)) * 0.6)
  out.dark = smooth(segment(reveal, 0.0, 0.22)) * (1 - smooth(segment(reveal, 0.82, 1)) * 0.25)
  out.env = lerp(1, 0.2, out.dark)
  out.envRot = lerp(-1.1, 1.25, smoother(segment(reveal, 0.18, 0.78)))
  out.key = lerp(1, 0.18, out.dark)
  out.rim = 1 + out.dark * 1.3
  out.haze = 1 - out.dark * 0.92
  // Bare metal gets the studio at the press and through printing.
  out.metal = smooth(local(t, 'formacao', 0.05, 0.25)) * (1 - smooth(local(t, 'identidade', 0.3, 0.6)))
  // The light passes across the front twice: during the close-up and on the final frame.
  const s1 = segment(reveal, 0.12, 0.45)
  const s2 = segment(reveal, 0.74, 0.97)
  out.sweep = s1 > 0 && s1 < 1 ? lerp(-1.6, 1.6, smoother(s1)) : lerp(-1.6, -0.45, smoother(s2))
  out.sweepAmt = Math.sin(Math.PI * s1) * 1.1 + smooth(s2) * 0.75
  return out
}
