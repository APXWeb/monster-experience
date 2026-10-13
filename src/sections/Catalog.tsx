import { useEffect, useRef } from 'react'
import { LINES, PRODUCTS, assetUrl, imageSrcSet, lineOf, productById, type Product } from '@/data/products'
import { useStore, visibleProducts, type Filter } from '@/state/store'
import { scrollToEl } from '@/motion/scroll'
import { Gauge } from '@/components/Gauge'
import { ArrowLeft, ArrowRight, Plus } from '@/components/icons'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas as variantes' },
  ...LINES.map((l) => ({ id: l.id as Filter, label: l.name })),
]

function useAccent(product: Product) {
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--accent', product.colors.accent)
    r.setProperty('--accent-deep', product.colors.deep)
  }, [product])
}

export function Catalog() {
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  const openDetail = useStore((s) => s.openDetail)
  const detailOpen = useStore((s) => s.detailOpen)
  const gl = useStore((s) => s.gl)
  const product = productById(selectedId)
  const line = lineOf(product.line)
  const list = visibleProducts(filter)
  const index = list.findIndex((p) => p.id === product.id)
  const stripRef = useRef<HTMLDivElement>(null)
  useAccent(product)

  // Keep the selected thumbnail in view inside the strip.
  useEffect(() => {
    const strip = stripRef.current
    const el = strip?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)
    if (!strip || !el) return
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2
    strip.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [selectedId, filter])

  const step = (d: number) => {
    const next = list[(index + d + list.length) % list.length]
    select(next.id)
  }

  const onStripKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    let i = index
    if (e.key === 'ArrowRight') i = (index + 1) % list.length
    if (e.key === 'ArrowLeft') i = (index - 1 + list.length) % list.length
    if (e.key === 'Home') i = 0
    if (e.key === 'End') i = list.length - 1
    select(list[i].id)
    stripRef.current?.querySelector<HTMLElement>(`[data-id="${list[i].id}"]`)?.focus()
  }

  const open = () => {
    scrollToEl('#sabores-stage', -96)
    openDetail()
  }

  return (
    <section id="bridge" className={`catalog${detailOpen ? ' is-detail' : ''}`} aria-labelledby="sabores-title">
      <span id="sabores" className="anchor" />
      <header className="catalog-head">
        <h2 id="sabores-title" className="display catalog-title">
          Explore o universo de sabores.
        </h2>
        <p className="catalog-lede">
          As {PRODUCTS.length} variantes listadas hoje no catálogo oficial brasileiro, organizadas pelas quatro linhas da marca. Cada
          ficha traz apenas o que a página oficial publica.
        </p>
        <div className="filters" role="group" aria-label="Filtrar por linha">
          {FILTERS.map((f) => {
            const count = visibleProducts(f.id).length
            const color = f.id === 'all' ? 'var(--text)' : lineOf(f.id).color
            return (
              <button
                key={f.id}
                className="filter"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                style={{ '--f': color } as React.CSSProperties}
              >
                {f.id !== 'all' && <span className="filter-dot" aria-hidden="true" />}
                {f.label}
                <span className="filter-count num">{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div id="sabores-stage" className="stage">
        <div className="stage-visual">
          <div id="can-slot" className="can-slot" aria-hidden="true">
            <img
              key={product.id}
              className={`can-fallback${gl === 'ok' ? ' is-gl' : ''}`}
              src={assetUrl(product.image)}
              srcSet={imageSrcSet(product)}
              sizes="(max-width: 1023px) 210px, 280px"
              alt=""
              width={250}
              height={625}
            />
          </div>
          <span className="sr-only">Imagem oficial da embalagem de {product.officialName}.</span>
        </div>

        <div className="stage-info" aria-live="polite">
          <h3 className="display stage-name">{product.displayName}</h3>
          <p className="stage-line">
            <span className="line-dot" style={{ background: line.color }} aria-hidden="true" />
            {line.name}
            <span className="stage-pos num">
              {index + 1} de {list.length}
            </span>
          </p>
          <p className="stage-flavor">{product.flavor}</p>
          <dl className="gauges">
            <Gauge product={product} k="calories" />
            <Gauge product={product} k="caffeine" />
            <Gauge product={product} k="sugars" />
          </dl>
          <div className="stage-actions">
            <button className="btn btn-primary" onClick={open}>
              <Plus />
              Ver ficha completa
            </button>
            <div className="stage-nav">
              <button className="icon-btn" onClick={() => step(-1)} aria-label="Sabor anterior">
                <ArrowLeft />
              </button>
              <button className="icon-btn" onClick={() => step(1)} aria-label="Próximo sabor">
                <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="strip-wrap">
        <div
          className="strip"
          ref={stripRef}
          role="listbox"
          aria-label="Variantes"
          aria-orientation="horizontal"
          onKeyDown={onStripKey}
        >
          {list.map((p) => (
            <Thumb key={p.id} product={p} selected={p.id === selectedId} onSelect={() => select(p.id)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Thumb({ product, selected, onSelect }: { product: Product; selected: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current!
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 16).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
  }
  const onLeave = () => {
    const el = ref.current!
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }
  return (
    <button
      ref={ref}
      data-id={product.id}
      className={`thumb${selected ? ' is-on' : ''}`}
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ '--c': product.colors.accent } as React.CSSProperties}
    >
      <span className="thumb-can">
        <img src={assetUrl(product.image)} alt="" width={250} height={625} loading="lazy" decoding="async" />
        <span className="thumb-sheen" aria-hidden="true" style={{ '--img': `url(${assetUrl(product.image)})` } as React.CSSProperties} />
      </span>
      <span className="thumb-name">{product.displayName}</span>
    </button>
  )
}
