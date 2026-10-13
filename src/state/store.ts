import { create } from 'zustand'
import { PRODUCTS, type LineId } from '@/data/products'

export type Filter = 'all' | LineId
export type GlStatus = 'pending' | 'ok' | 'off'

interface State {
  selectedId: string
  filter: Filter
  detailOpen: boolean
  gl: GlStatus
  stageReady: boolean
  select: (id: string) => void
  setFilter: (f: Filter) => void
  openDetail: (id?: string) => void
  closeDetail: () => void
  setGl: (s: GlStatus) => void
  setStageReady: () => void
}

export const useStore = create<State>((set, get) => ({
  selectedId: PRODUCTS[0].id,
  filter: 'all',
  detailOpen: false,
  gl: 'pending',
  stageReady: false,
  select: (id) => set({ selectedId: id }),
  setFilter: (filter) => {
    const visible = visibleProducts(filter)
    const keep = visible.some((p) => p.id === get().selectedId)
    set({ filter, selectedId: keep ? get().selectedId : visible[0].id })
  },
  openDetail: (id) => set({ detailOpen: true, selectedId: id ?? get().selectedId }),
  closeDetail: () => set({ detailOpen: false }),
  setGl: (gl) => set({ gl }),
  setStageReady: () => set({ stageReady: true }),
}))

export const visibleProducts = (filter: Filter) =>
  filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.line === filter)
