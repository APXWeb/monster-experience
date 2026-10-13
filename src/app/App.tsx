import { lazy, Suspense, useEffect, useState } from 'react'
import { initScroll } from '@/motion/scroll'
import { useStore } from '@/state/store'
import { Header } from '@/components/Header'
import { Loader } from '@/components/Loader'
import { Journey } from '@/sections/Journey'
import { Catalog } from '@/sections/Catalog'
import { Detail } from '@/sections/Detail'
import { Finale } from '@/sections/Finale'
import { hasWebGL } from '@/utils/webgl'

const Stage = lazy(() => import('@/three/Stage'))

export function App() {
  const gl = useStore((s) => s.gl)
  const setGl = useStore((s) => s.setGl)
  const [supported] = useState(() => hasWebGL() && !new URLSearchParams(location.search).has('nogl'))

  useEffect(() => {
    if (!supported) setGl('off')
  }, [supported, setGl])

  useEffect(() => initScroll(), [])

  useEffect(() => {
    document.documentElement.classList.toggle('no-webgl', gl === 'off')
  }, [gl])

  return (
    <>
      <a className="skip" href="#sabores">
        Pular para os sabores
      </a>
      {supported && gl !== 'off' && (
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      )}
      <Loader />
      <Header />
      <main className="page" id="conteudo">
        <Journey />
        <Catalog />
        <Finale />
      </main>
      <Detail />
    </>
  )
}
