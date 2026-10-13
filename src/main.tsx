import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/big-shoulders-display/800'
import '@fontsource/big-shoulders-display/900'
import '@fontsource-variable/figtree/wght'
import './styles/base.css'
import './styles/chrome.css'
import './styles/journey.css'
import './styles/catalog.css'
import './styles/detail.css'
import './styles/finale.css'
import { App } from './app/App'

// Mount once the display face is in, so the opening never reflows on font swap
// (bounded: a slow font network never holds the page).
const fonts = Promise.all([
  document.fonts.load('900 1em "Big Shoulders Display"', 'TODA LATA'),
  document.fonts.load('500 1em "Figtree Variable"', 'Uma jornada'),
])
const timeout = new Promise((r) => setTimeout(r, 1200))
Promise.race([fonts, timeout]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
