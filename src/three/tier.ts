/** Device tier decided once: phones and small GPUs get lighter liquids and fewer particles. */
export const tier = (() => {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
  const forced = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
  const low = forced || coarse || small || (navigator.hardwareConcurrency ?? 8) <= 4
  return { low, maxDpr: low ? 1.5 : 1.75 }
})()
