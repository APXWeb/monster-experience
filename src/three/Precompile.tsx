import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Compiles every program in the scene up front (under the loader curtain), so no
 * station stalls the first time it scrolls into view. Parts hide themselves every
 * frame, so they are briefly forced visible for the compile and then restored.
 */
export function Precompile({ onDone, target }: { onDone: () => void; target: THREE.WebGLRenderTarget | null }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let alive = true
    const id = window.setTimeout(async () => {
      // Frames keep running during the async compile and re-hide parts, so force
      // visibility again right before each step.
      const forceAll = () => {
        const hidden: THREE.Object3D[] = []
        scene.traverse((o) => {
          if (!o.visible) {
            hidden.push(o)
            o.visible = true
          }
        })
        return hidden
      }
      try {
        // Compile against the composer's buffer: a render target selects different
        // program variants (no tone mapping, linear output) than the canvas would.
        const prev = gl.getRenderTarget()
        gl.setRenderTarget(target)
        let hidden = forceAll()
        await gl.compileAsync(scene, camera)
        hidden.forEach((o) => (o.visible = false))
        // One real render with everything on: allocates shadow and transmission
        // targets and uploads textures now instead of mid-scroll.
        hidden = forceAll()
        gl.setRenderTarget(target)
        gl.render(scene, camera)
        gl.setRenderTarget(prev)
        hidden.forEach((o) => (o.visible = false))
      } catch {
        /* a failed warm-up only costs a later hitch */
      }
      if (alive) onDone()
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(id)
    }
  }, [gl, scene, camera, onDone, target])
  return null
}
