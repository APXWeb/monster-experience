export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return false
    // Software rasterisers cannot carry this scene; treat them as no WebGL.
    const dbg = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    const name = dbg ? String((gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software/i.test(name)
  } catch {
    return false
  }
}
