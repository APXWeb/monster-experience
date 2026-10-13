import { useEffect, useState } from 'react'
import { useStore } from '@/state/store'

/** Short curtain while the label is composed; never blocks for more than a few seconds. */
export function Loader() {
  const ready = useStore((s) => s.stageReady)
  const gl = useStore((s) => s.gl)
  const [timedOut, setTimedOut] = useState(false)
  const [gone, setGone] = useState(false)
  const done = ready || gl === 'off' || timedOut

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), 6000)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => setGone(true), 900)
    return () => window.clearTimeout(id)
  }, [done])

  if (gone) return null
  return (
    <div className={`loader${done ? ' is-done' : ''}`} role="status" aria-live="polite">
      <div className="loader-inner">
        <span className="loader-line" aria-hidden="true" />
        <p>{done ? 'Linha pronta' : 'Preparando a linha'}</p>
      </div>
    </div>
  )
}
