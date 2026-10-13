import { useEffect, useRef } from 'react'
import { onScroll, scroll, scrollToEl, scrollToJourney } from '@/motion/scroll'

export function Header() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    // Over the free-scrolling sections the chrome gets its own ground, so content never collides with it.
    const update = () => ref.current?.classList.toggle('is-solid', scroll.journey >= 0.995)
    update()
    return onScroll(update)
  }, [])
  const go = (e: React.MouseEvent, target: string) => {
    e.preventDefault()
    if (target === '#jornada') scrollToJourney(0.08)
    else scrollToEl(target)
  }
  return (
    <header className="site-header" ref={ref}>
      <a className="brand" href="#topo" onClick={(e) => go(e, '#topo')} aria-label="APX Web, voltar ao início">
        <span className="brand-mark">APX</span>
        <span className="brand-word">Web</span>
        <span className="brand-tag">Projeto conceitual</span>
      </a>
      <nav aria-label="Seções">
        <a href="#jornada" onClick={(e) => go(e, '#jornada')}>
          Jornada
        </a>
        <a href="#sabores" onClick={(e) => go(e, '#sabores')}>
          Sabores
        </a>
        <a href="#finale" onClick={(e) => go(e, '#finale')} className="nav-hide-sm">
          Sobre o projeto
        </a>
      </nav>
    </header>
  )
}
