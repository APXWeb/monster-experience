import * as THREE from 'three'

/**
 * Studio environment for reflections, baked once into a PMREM cube.
 * A black room with long softbox strips: a white key overhead, two vertical
 * strips for the can's edge highlights, and a faint acid-green strip low on one
 * side so the metal carries the line's colour without being painted with it.
 */
export function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#020303')

  const panel = (w: number, h: number, color: string, intensity: number) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m)
  }

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 16, 30),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#050606'), side: THREE.BackSide }),
  )
  scene.add(room)

  const top = panel(10, 3, '#ffffff', 2.6)
  top.position.set(0, 7.5, 0)
  top.rotation.x = Math.PI / 2
  scene.add(top)

  const left = panel(1.2, 12, '#ffffff', 3.2)
  left.position.set(-9, 1, 4)
  left.lookAt(0, 1, 0)
  scene.add(left)

  const right = panel(0.8, 12, '#f2f6ff', 2.2)
  right.position.set(9, 1, 2)
  right.lookAt(0, 1, 0)
  scene.add(right)

  // Low, wide soft wall behind the set: horizontal metal (strip, disc, bed) catches it.
  const back = panel(22, 5, '#e9eef0', 0.55)
  back.position.set(0, 0.5, -12)
  back.lookAt(0, 2.5, 0)
  scene.add(back)

  const green = panel(9, 0.7, '#8fff3a', 0.4)
  green.position.set(-6, -3.5, -7)
  green.lookAt(0, 0, 0)
  scene.add(green)

  const floorGlow = panel(18, 18, '#0b0f0c', 1)
  floorGlow.position.set(0, -7.9, 0)
  floorGlow.rotation.x = -Math.PI / 2
  scene.add(floorGlow)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromScene(scene, 0.035)
  pmrem.dispose()
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
  })
  return rt
}
