import { CATALOG_ACCESSED, CATALOG_SOURCE, PRODUCTS, assetUrl } from '@/data/products'
import { scrollToEl } from '@/motion/scroll'
import { ArrowUp } from '@/components/icons'

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR')

export function Finale() {
  return (
    <section id="finale" className="finale" aria-labelledby="finale-title">
      <div className="finale-copy">
        <h2 id="finale-title" className="display finale-title">
          Uma linha.
          <br />
          <span>{PRODUCTS.length} identidades.</span>
        </h2>
      </div>
      {/* The 3D line-up rises here; without WebGL the official renders stand in. */}
      <div className="finale-rack" aria-hidden="true">
        {PRODUCTS.map((p) => (
          <img key={p.id} src={assetUrl(p.image)} alt="" width={250} height={625} loading="lazy" />
        ))}
      </div>
      <footer className="finale-foot">
        <p className="finale-disclaimer">Projeto conceitual desenvolvido pela APX Web. Não afiliado ou endossado pela Monster Energy.</p>
        <p className="finale-meta">
          Nomes, descrições, valores e imagens de produto transcritos de{' '}
          <a href={CATALOG_SOURCE} target="_blank" rel="noreferrer noopener">
            monsterenergy.com/pt-br
          </a>
          , consultado em {fmtDate(CATALOG_ACCESSED)}. Marcas e embalagens pertencem aos seus titulares. A jornada da lata é uma
          interpretação visual e não documenta processos reais da empresa.
        </p>
        <button className="btn btn-ghost" onClick={() => scrollToEl('#topo')}>
          <ArrowUp />
          Voltar ao início
        </button>
      </footer>
    </section>
  )
}
