import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // GitHub Pages serves from /<repo>/; local dev and preview stay at /.
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5180 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // three + R3F load with the lazy stage only; the DOM experience never waits on them.
        manualChunks(id) {
          const m = id.split(String.fromCharCode(92)).join('/')
          if (/node_modules\/(react|react-dom|scheduler|zustand)\//.test(m)) return 'react'
          if (/node_modules\/(three|@react-three|its-fine|suspend-react)/.test(m)) return 'three'
          if (/node_modules\/(lenis)\//.test(m)) return 'motion'
        },
      },
    },
  },
})
