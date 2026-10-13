import * as THREE from 'three'
import type { LabelLayers } from './textures'

/**
 * Can materials. Physically based (MeshPhysicalMaterial) with small shader
 * injections for what the story needs: the staged print, the dissolve into
 * droplets, and the projection of official renders in the catalog.
 */

const NOISE = /* glsl */ `
float hash31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  float n000 = hash31(i), n100 = hash31(i+vec3(1,0,0)), n010 = hash31(i+vec3(0,1,0)), n110 = hash31(i+vec3(1,1,0));
  float n001 = hash31(i+vec3(0,0,1)), n101 = hash31(i+vec3(1,0,1)), n011 = hash31(i+vec3(0,1,1)), n111 = hash31(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`

export interface CanUniforms {
  uDissolve: { value: number }
  uEdge: { value: THREE.Color }
  uPrintBase: { value: number }
  uPrintClaw: { value: number }
  uPrintWord: { value: number }
  uPrintGlow: { value: number }
  /** Sweep position across the front, -1.6..1.6; strength in uSweepAmt. */
  uSweep: { value: number }
  uSweepAmt: { value: number }
}

export const makeCanUniforms = (): CanUniforms => ({
  uDissolve: { value: 0 },
  uEdge: { value: new THREE.Color('#9dff3c') },
  uPrintBase: { value: 1 },
  uPrintClaw: { value: 1 },
  uPrintWord: { value: 1 },
  uPrintGlow: { value: 1 },
  uSweep: { value: -2 },
  uSweepAmt: { value: 0 },
})

/** Shared vertex additions: object-space position and the raw uv. */
function vertexPatch(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying vec2 vCanUv;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvCanUv = uv;')
}

const DISSOLVE_FRAG = /* glsl */ `
  float dn = fbm(vObj * 5.5 + vec3(0.0, vObj.y * 1.5, 0.0));
  float dz = uDissolve * 1.15;
  if (dn < dz - 0.08) discard;
  float dEdge = 1.0 - smoothstep(0.0, 0.08, dn - (dz - 0.08));
  dEdge *= step(0.001, uDissolve);
`

/** Journey can body: bare aluminium that receives the label in stages. */
export function makeBodyMaterial(label: LabelLayers | null, u: CanUniforms, droplets: THREE.Texture) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e3e8ec'),
    metalness: 1,
    roughness: 0.3,
    anisotropy: 0.65,
    anisotropyRotation: Math.PI / 2,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1,
    side: THREE.DoubleSide,
    normalMap: droplets,
    normalScale: new THREE.Vector2(0, 0),
  })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, {
      uBase: { value: label?.base ?? null },
      uGfx: { value: label?.graphics ?? null },
      uMasks: { value: label?.masks ?? null },
      uHasLabel: { value: label ? 1 : 0 },
    })
    vertexPatch(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj; varying vec2 vCanUv;
        uniform sampler2D uBase; uniform sampler2D uGfx; uniform sampler2D uMasks; uniform float uHasLabel;
        uniform float uDissolve; uniform vec3 uEdge;
        uniform float uPrintBase; uniform float uPrintClaw; uniform float uPrintWord; uniform float uPrintGlow;
        uniform float uSweep; uniform float uSweepAmt;
        float gInk; float gGfx; float gGlow;
        ${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        ${DISSOLVE_FRAG}
        gInk = 0.0; gGfx = 0.0; gGlow = 0.0;
        if (uHasLabel > 0.5 && gl_FrontFacing) {
          vec4 base = texture2D(uBase, vCanUv);
          vec4 gfx = texture2D(uGfx, vCanUv);
          vec3 mk = texture2D(uMasks, vCanUv).rgb;
          // Base ink rises from the bottom.
          float hb = uPrintBase * 1.08 - 0.02;
          float baseMask = smoothstep(hb + 0.006, hb - 0.006, vCanUv.y);
          float baseBand = exp(-pow((vCanUv.y - hb) * 90.0, 2.0)) * step(0.001, uPrintBase) * step(uPrintBase, 0.999);
          // Claw and wordmark open from the front centre outward.
          float d = abs(vCanUv.x - 0.5) * 2.0;
          float cw = uPrintClaw * 1.06;
          float clawMask = smoothstep(cw + 0.01, cw - 0.01, d);
          float clawBand = exp(-pow((d - cw) * 60.0, 2.0)) * step(0.001, uPrintClaw) * step(uPrintClaw, 0.999);
          float ww = uPrintWord * 1.06;
          float wordMask = smoothstep(ww + 0.01, ww - 0.01, d);
          float gA = gfx.a * max(mk.r * clawMask, mk.g * wordMask);
          float bA = base.a * baseMask;
          diffuseColor.rgb = mix(diffuseColor.rgb, base.rgb, bA);
          diffuseColor.rgb = mix(diffuseColor.rgb, gfx.rgb, gA);
          gInk = bA; gGfx = gA;
          float wordBand = exp(-pow((d - ww) * 60.0, 2.0)) * step(0.001, uPrintWord) * step(uPrintWord, 0.999);
          gGlow = (baseBand * base.a + clawBand * mk.r * gfx.a + wordBand * mk.g * gfx.a) * uPrintGlow;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(roughnessFactor, 0.3, gInk), 0.34, gGfx);
        if (!gl_FrontFacing) roughnessFactor = 0.42;`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(mix(metalnessFactor, 0.5, gInk), 0.08, gGfx);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEdge * (dEdge * 3.0 + gGlow * 1.3) + diffuseColor.rgb * gGfx * 0.07;
        // Light passing across the metal: a soft vertical band riding the front.
        if (uSweepAmt > 0.001 && gl_FrontFacing) {
          float sx = (vCanUv.x - 0.5) * 4.0;
          float band = exp(-pow((sx - uSweep) * 2.6, 2.0));
          float edgeFade = 1.0 - smoothstep(0.75, 1.0, abs(sx) * 0.5);
          totalEmissiveRadiance += vec3(0.92, 0.97, 1.0) * band * edgeFade * uSweepAmt * mix(0.9, 0.35, gInk) * mix(1.0, 0.55, gGfx);
        }`,
      )
  }
  m.customProgramCacheKey = () => `can-body-${label ? 1 : 0}`
  return m
}

/** Lid, tab and other bare-metal parts that share the dissolve. */
export function makeMetalMaterial(u: Pick<CanUniforms, 'uDissolve' | 'uEdge'>, color = '#c9cdd1', roughness = 0.24) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 1,
    roughness,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u)
    vertexPatch(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj; varying vec2 vCanUv; uniform float uDissolve; uniform vec3 uEdge;
        ${NOISE}`,
      )
      .replace('#include <map_fragment>', `#include <map_fragment>\n${DISSOLVE_FRAG}`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * dEdge * 3.0;`,
      )
  }
  m.customProgramCacheKey = () => 'can-metal'
  return m
}

export interface ProductUniforms {
  uMap: { value: THREE.Texture | null }
  /** Image height / width of the render. */
  uAspect: { value: number }
  uFade: { value: number }
  /** Vertical scale applied to the mesh, so the projection runs in scaled space. */
  uScaleY: { value: number }
}

/** Height the body is scaled to for a render of the given aspect (top of the image is the lid ellipse). */
export const productHeight = (aspect: number) => aspect * 0.66 - 0.035 - 0.06

/**
 * Catalog can: the official render is projected orthographically onto the front of
 * the body (and mirrored onto the back). The render's own baked shading carries most
 * of the look; the physical layer adds live clearcoat reflections as the can turns.
 */
export function makeProductMaterial(u: ProductUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0,
    roughness: 0.62,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.32,
    transparent: true,
  })
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u)
    vertexPatch(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObj; varying vec2 vCanUv; uniform sampler2D uMap; uniform float uAspect; uniform float uFade; uniform float uScaleY;
        vec3 gTex;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          // The render frames the can edge to edge: width = diameter, height = aspect * width.
          float pu = clamp(0.5 + vObj.x / (2.0 * ${'0.33'}), 0.004, 0.996);
          float imgH = uAspect * 0.66;
          float pv = clamp((vObj.y * uScaleY + 0.035) / imgH, 0.0, 1.0);
          vec4 tx = texture2D(uMap, vec2(pu, pv));
          // The render's outer columns are foreshortened to a few pixels; seen from the
          // side they would smear into streaks. Fade them to a blurred, darker tone.
          float side = smoothstep(0.8, 0.985, abs(vObj.x) / 0.33);
          vec3 soft = texture2D(uMap, vec2(pu, pv), 5.0).rgb * 0.72;
          gTex = mix(tx.rgb, soft, side);
          diffuseColor.rgb = gTex;
          diffuseColor.a *= uFade;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += gTex * 0.5;`,
      )
  }
  m.customProgramCacheKey = () => 'can-product'
  return m
}
