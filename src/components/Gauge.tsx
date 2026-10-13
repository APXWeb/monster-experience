import { FIGURE_META, FIGURE_RANGE, formatNumber, type FigureKey, type Product } from '@/data/products'

const TICKS = 21

/**
 * One instrument row: label and unit, the value, and a ruled scale that spans the
 * catalog-wide range (min to max across all 17 variants), so flavors cross-check.
 */
export function Gauge({ product, k }: { product: Product; k: FigureKey }) {
  const f = product.figures[k]
  const meta = FIGURE_META[k]
  const range = FIGURE_RANGE[k]
  const pos = f ? (f.value - range.min) / Math.max(1e-6, range.max - range.min) : 0
  return (
    <div className={`gauge${f ? '' : ' is-empty'}`}>
      <dt className="gauge-label">
        {meta.label}
        <span className="gauge-unit">{meta.unit}</span>
      </dt>
      <dd className="gauge-value">
        {f ? <span className="gauge-num num display">{formatNumber(f.value)}</span> : <span className="gauge-missing">Não informado</span>}
      </dd>
      <dd className="gauge-scale" aria-hidden="true">
        <span className="gauge-ruler">
          {Array.from({ length: TICKS }, (_, i) => (
            <span key={i} className={`gauge-tick${i % 5 === 0 ? ' is-major' : ''}${f && i / (TICKS - 1) <= pos + 1e-6 ? ' is-lit' : ''}`} />
          ))}
          {f && <span className="gauge-needle" style={{ left: `${pos * 100}%` }} />}
        </span>
        <span className="gauge-ends num">
          <span>{formatNumber(range.min)}</span>
          <span>{formatNumber(range.max)}</span>
        </span>
      </dd>
    </div>
  )
}
