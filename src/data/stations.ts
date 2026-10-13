/**
 * The six stations of the journey and where each one lives on the scroll track.
 * `start`/`end` are fractions of the journey section's scroll distance (0..1).
 * The copy is authored for this concept; it describes a stylized interpretation,
 * never Monster's real formula, plant or quality procedures.
 */

export interface Station {
  id: string
  index: number
  title: string
  body: string
  /** Optional sub-steps the 3D strikes through (shown as a live list). */
  steps?: string[]
  start: number
  end: number
}

export const HERO_END = 0.065

export const STATIONS: Station[] = [
  {
    id: 'origem',
    index: 1,
    title: 'Origem',
    body: 'Antes de qualquer forma, existe o líquido. Gotas soltas encontram ritmo e se organizam em uma única composição.',
    start: HERO_END,
    end: 0.215,
  },
  {
    id: 'formulacao',
    index: 2,
    title: 'Pesquisa e formulação',
    body: 'Vidro, medida e luz técnica. A ideia ganha método, camada por camada, antes de seguir adiante.',
    start: 0.215,
    end: 0.365,
  },
  {
    id: 'formacao',
    index: 3,
    title: 'Formação da lata',
    body: 'Um disco de alumínio recebe golpe após golpe até virar corpo, fundo e gargalo.',
    steps: ['Corte', 'Embutimento', 'Estiramento', 'Fundo', 'Gargalo'],
    start: 0.365,
    end: 0.555,
  },
  {
    id: 'identidade',
    index: 4,
    title: 'Identidade',
    body: 'O metal cru recebe cor e símbolo. A garra aparece como deve aparecer: inteira, nítida, sem improviso.',
    steps: ['Base', 'Símbolo', 'Assinatura'],
    start: 0.555,
    end: 0.7,
  },
  {
    id: 'envase',
    index: 5,
    title: 'Envase e acabamento',
    body: 'A lata atravessa a linha, recebe o líquido e é fechada. Luz, metal e movimento em um só fluxo.',
    steps: ['Linha', 'Envase', 'Tampa'],
    start: 0.7,
    end: 0.85,
  },
  {
    id: 'revelacao',
    index: 6,
    title: 'Revelação',
    body: 'O ambiente escurece, a luz percorre o metal e a lata aparece por inteiro.',
    start: 0.85,
    end: 1,
  },
]

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const segment = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
