import { useEffect, useRef } from 'react'
import { CATALOG_ACCESSED, assetUrl, imageSrcSet, lineOf, productById } from '@/data/products'
import { useStore, visibleProducts } from '@/state/store'
import { startScroll, stopScroll } from '@/motion/scroll'
import { Gauge } from '@/components/Gauge'
import { ArrowLeft, ArrowRight, Close, External, Grid } from '@/components/icons'

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR')

/**
 * Full record of one variant: a side panel on desktop, a sheet on phones. The 3D can
 * stays visible beside it. Focus is trapped while open; Esc and the back control close it.
 */
export function Detail() {
  const open = useStore((s) => s.detailOpen)
  const close = useStore((s) => s.closeDetail)
  const select = useStore((s) => s.select)
  const selectedId = useStore((s) => s.selectedId)
  const filter = useStore((s) => s.filter)
  const product = productById(selectedId)
  const line = lineOf(product.line)
  const list = visibleProducts(filter)
  const index = list.findIndex((p) => p.id === product.id)
  const panel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const step = (d: number) => select(list[(index + d + list.length) % list.length].id)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement
    stopScroll()
    const id = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const f = panel.current!.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('keydown', onKey)
      startScroll()
      returnFocus.current?.focus?.()
    }
  }, [open, close])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [selectedId])

  return (
    <div className={`detail${open ? ' is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="detail-backdrop" onClick={close} />
      <div
        ref={panel}
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        style={{ '--c': product.colors.accent } as React.CSSProperties}
      >
        <div className="detail-bar">
          <button className="btn btn-ghost detail-back" onClick={close} data-autofocus>
            <Grid />
            Voltar ao catálogo
          </button>
          <button className="icon-btn" onClick={close} aria-label="Fechar ficha">
            <Close />
          </button>
        </div>

        <div className="detail-scroll" ref={scroller} key={product.id}>
          <header className="detail-head">
            <h2 id="detail-title" className="display detail-name">
              {product.displayName}
            </h2>
            <p className="stage-line">
              <span className="line-dot" style={{ background: line.color }} aria-hidden="true" />
              {line.name}
            </p>
            <p className="detail-official">Nome na página oficial: {product.officialName}</p>
            <img
              className="detail-can"
              src={assetUrl(product.image)}
              srcSet={imageSrcSet(product)}
              sizes="80px"
              alt={`Embalagem oficial de ${product.officialName}`}
              width={250}
              height={625}
            />
          </header>

          <section className="detail-block">
            <h3>Perfil de sabor</h3>
            <p className="detail-flavor">{product.flavor}</p>
          </section>

          <section className="detail-block">
            <h3>Descrição oficial</h3>
            <p className="detail-text">{product.description}</p>
          </section>

          <section className="detail-block">
            <h3>Dados publicados</h3>
            <dl className="gauges gauges-detail">
              <Gauge product={product} k="calories" />
              <Gauge product={product} k="caffeine" />
              <Gauge product={product} k="sugars" />
            </dl>
            <p className="detail-note">
              Valores como aparecem na página oficial do produto, que não indica a porção de referência. A escala de cada medidor vai do
              menor ao maior valor entre as {visibleProducts('all').length} variantes.
            </p>
          </section>

          <section className="detail-block detail-facts">
            <div>
              <h3>Volume</h3>
              {product.volume ? (
                <>
                  <p className="detail-big">
                    <span className="display num">{product.volume.ml}</span> ml
                  </p>
                  <p className="detail-note">{product.volume.basis}</p>
                </>
              ) : (
                <p className="detail-missing">Não informado na página oficial consultada.</p>
              )}
            </div>
            <div>
              <h3>Ingredientes</h3>
              <p className="detail-missing">{product.ingredients ?? 'Lista não publicada na página oficial consultada.'}</p>
            </div>
          </section>

          <section className="detail-block">
            <h3>Rotulagem</h3>
            {product.packNotes.length ? (
              <ul className="detail-list">
                {product.packNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="detail-missing">Nenhum selo frontal identificado na imagem oficial da embalagem.</p>
            )}
            <p className="detail-note">Consulte sempre o rótulo da embalagem física para a tabela nutricional completa e as advertências.</p>
          </section>

          <section className="detail-block">
            <h3>Fontes</h3>
            <ul className="detail-sources">
              {product.sources
                .filter((s, i, arr) => arr.findIndex((o) => o.url === s.url && o.label === s.label) === i && !s.note)
                .map((s) => (
                  <li key={s.label}>
                    <a href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.label}
                      <External />
                    </a>
                    <span>Consultado em {fmtDate(s.accessed || CATALOG_ACCESSED)}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <nav className="detail-nav" aria-label="Navegar entre sabores">
          <button className="detail-step" onClick={() => step(-1)}>
            <ArrowLeft />
            <span>
              <small>Anterior</small>
              {list[(index - 1 + list.length) % list.length].displayName}
            </span>
          </button>
          <span className="detail-count num" aria-live="polite">
            {index + 1} / {list.length}
          </span>
          <button className="detail-step detail-step-next" onClick={() => step(1)}>
            <span>
              <small>Próximo</small>
              {list[(index + 1) % list.length].displayName}
            </span>
            <ArrowRight />
          </button>
        </nav>
      </div>
    </div>
  )
}
