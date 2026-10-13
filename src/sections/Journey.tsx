import { useEffect, useRef } from 'react'
import { HERO_END, STATIONS, segment } from '@/data/stations'
import { onScroll, scroll, scrollToJourney, motion } from '@/motion/scroll'
import { FORM_STEP_EDGES, LINE_STEP_EDGES, PRINT_STEP_EDGES, stepIndex } from '@/three/timeline'
import { assetUrl } from '@/data/products'
import { hud } from '@/motion/hud'

const STEP_EDGES: Record<string, number[]> = {
  formacao: FORM_STEP_EDGES,
  identidade: PRINT_STEP_EDGES,
  envase: LINE_STEP_EDGES,
}

const FADE = 0.024

/** Opacity of a station's copy for journey progress t. */
function stationAlpha(i: number, t: number) {
  const s = STATIONS[i]
  const a = segment(t, s.start + 0.004, s.start + FADE)
  const last = i === STATIONS.length - 1
  const b = last ? 1 : 1 - segment(t, s.end - FADE, s.end - 0.004)
  return Math.min(a, b)
}

export function Journey() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current!
    const hero = el.querySelector<HTMLElement>('.hero-copy')!
    const cue = el.querySelector<HTMLElement>('.scroll-cue')!
    const cueBar = el.querySelector<HTMLElement>('.scroll-cue-bar')!
    const panels = Array.from(el.querySelectorAll<HTMLElement>('.station'))
    const stills = Array.from(el.querySelectorAll<HTMLElement>('.still'))
    const railItems = Array.from(el.querySelectorAll<HTMLElement>('.rail-item'))
    const railFill = Array.from(el.querySelectorAll<HTMLElement>('.rail-fill'))
    const mobileFill = el.querySelector<HTMLElement>('.rail-mobile-fill')!
    const mobileLabel = el.querySelector<HTMLElement>('.rail-mobile-label')!
    const note = el.querySelector<HTMLElement>('.journey-note')!
    const rail = el.querySelector<HTMLElement>('.rail')!
    const railMobile = el.querySelector<HTMLElement>('.rail-mobile')!
    let lastActive = -2

    const update = () => {
      const t = scroll.journey
      const heroA = 1 - segment(t, 0.012, HERO_END - 0.01)
      hero.style.opacity = String(heroA)
      hero.style.transform = motion.reduced ? '' : `translate3d(0, ${(1 - heroA) * -40}px, 0)`
      hero.style.visibility = heroA < 0.01 ? 'hidden' : 'visible'
      cue.style.opacity = String(heroA)
      cueBar.style.transform = `scaleX(${Math.min(1, t / HERO_END)})`

      let active = -1
      panels.forEach((p, i) => {
        const a = stationAlpha(i, t)
        p.style.opacity = String(a)
        p.style.transform = motion.reduced ? '' : `translate3d(0, ${(1 - a) * 28}px, 0)`
        p.style.visibility = a < 0.01 ? 'hidden' : 'visible'
        if (t >= STATIONS[i].start) active = i
        const edges = STEP_EDGES[STATIONS[i].id]
        if (edges) {
          const k = stepIndex(t, STATIONS[i].id, edges)
          p.querySelectorAll('.step').forEach((s, j) => {
            s.classList.toggle('is-on', j === k)
            s.classList.toggle('is-done', j < k)
          })
        }
      })
      stills.forEach((s, i) => {
        const a = i === 0 ? heroA : stationAlpha(i - 1, t)
        s.style.opacity = String(a)
      })
      railFill.forEach((f, i) => {
        const s = STATIONS[i]
        f.style.transform = `scaleY(${segment(t, s.start, s.end)})`
      })
      if (active !== lastActive) {
        lastActive = active
        railItems.forEach((r, i) => {
          r.classList.toggle('is-on', i === active)
          if (i === active) r.setAttribute('aria-current', 'step')
          else r.removeAttribute('aria-current')
        })
        mobileLabel.textContent = active < 0 ? 'Início' : `${String(active + 1).padStart(2, '0')} / 06  ${STATIONS[active].title}`
      }
      mobileFill.style.transform = `scaleX(${t})`
      const release = 1 - segment(t, 0.955, 0.995)
      rail.style.opacity = String(Math.min(1, segment(t, 0.01, HERO_END * 0.6) * 0.6 + 0.4) * release)
      rail.style.visibility = release < 0.01 ? 'hidden' : 'visible'
      railMobile.style.opacity = String(release)
      note.style.opacity = String(Math.min(1, segment(t, HERO_END * 0.6, HERO_END + 0.02)) * (1 - segment(t, 0.97, 1)))
    }
    update()
    const off = onScroll(update)

    // The press overlay follows the geometry every frame (the camera breathes).
    const callouts = Array.from(el.querySelectorAll<HTMLElement>('.callout'))
    const ticks = Array.from(el.querySelectorAll<HTMLElement>('.register-tick'))
    const count = el.querySelector<HTMLElement>('.register-count')!
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const live = hud.form > 0 || scroll.journey > STATIONS[2].start
      if (!live) return
      callouts.forEach((c) => {
        const a = hud[c.dataset.anchor as 'disc' | 'wall' | 'bottom' | 'neck']
        c.classList.toggle('is-on', a.on)
        if (a.on) c.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`
      })
      // A strike is registered once it has fully landed.
      const done = Math.floor(hud.form + 0.02)
      ticks.forEach((tk, i) => tk.classList.toggle('is-on', i < done))
      count.textContent = String(Math.min(5, done)).padStart(2, '0')
    }
    raf = requestAnimationFrame(tick)
    return () => {
      off()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="journey" className="journey" aria-label="A jornada da lata">
      <span id="topo" className="anchor" />
      <span id="jornada" className="anchor anchor-jornada" />
      <div className="journey-screen" ref={root}>
        <div className="stills" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <img key={i} className="still" src={assetUrl(`stills/s${i}.jpg`)} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
          ))}
        </div>
        <div className="scrim" aria-hidden="true" />

        <div className="hero-copy">
          <h1 className="display hero-title">
            <span>Toda lata</span>
            <span>começa como</span>
            <span className="hero-accent">uma gota.</span>
          </h1>
          <p className="hero-lede">
            Uma jornada visual do líquido ao metal, conduzida pelo seu scroll. No fim dela, cada sabor do catálogo brasileiro.
          </p>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span>Role para iniciar a linha</span>
          <span className="scroll-cue-track">
            <span className="scroll-cue-bar" />
          </span>
        </div>

        {STATIONS.map((s) => (
          <article key={s.id} className={`station station-${s.id}`} aria-labelledby={`st-${s.id}`}>
            <h2 id={`st-${s.id}`} className="station-head">
              <span className="station-num display num" aria-hidden="true">
                {String(s.index).padStart(2, '0')}
              </span>
              <span className="sr-only">Etapa {s.index} de 6: </span>
              <span className="station-title display">{s.title}</span>
            </h2>
            <p className="station-body">{s.body}</p>
            {s.id === 'formacao' && (
              <div className="register" aria-hidden="true">
                <span className="register-label">Golpes registrados</span>
                <span className="register-count display num">00</span>
                <span className="register-scale">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="register-tick" />
                  ))}
                </span>
                <span className="register-total num">/ 05</span>
              </div>
            )}
            {s.steps && (
              <ol className="steps">
                {s.steps.map((step) => (
                  <li key={step} className="step">
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}

        <div className="callouts" aria-hidden="true">
          <span className="callout" data-anchor="disc">Disco de alumínio</span>
          <span className="callout" data-anchor="wall">Parede estirada</span>
          <span className="callout" data-anchor="bottom">Fundo em domo</span>
          <span className="callout" data-anchor="neck">Gargalo</span>
        </div>

        <nav className="rail" aria-label="Etapas da jornada">
          <ol>
            {STATIONS.map((s, i) => (
              <li key={s.id}>
                <button className="rail-item" onClick={() => scrollToJourney(s.start + (s.end - s.start) * 0.55)}>
                  <span className="rail-label">{s.title}</span>
                  <span className="rail-num num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rail-track" aria-hidden="true">
                    <span className="rail-fill" />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="rail-mobile" aria-hidden="true">
          <span className="rail-mobile-label">Início</span>
          <span className="rail-mobile-track">
            <span className="rail-mobile-fill" />
          </span>
        </div>

        <p className="journey-note">
          Interpretação visual conceitual. Não retrata a fórmula, a fábrica nem os processos da Monster Energy.
        </p>
      </div>
    </section>
  )
}
