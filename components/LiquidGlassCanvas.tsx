'use client'

import { useEffect, useRef, useCallback } from 'react'

// ── Vertex shader ─────────────────────────────────────────────────────────────
// Simulates a convex glass lens: normals tilt outward at edges so the
// fragment shader bends light like real curved glass.
const VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vN;

void main() {
  vUv = uv;
  // Lens curvature: map UV [0,1] → [-1,1], tilt normals at edges
  float nx = (uv.x - 0.5) * 2.0 * 0.55;
  float ny = (uv.y - 0.5) * 2.0 * 0.35;
  float nz = sqrt(max(0.001, 1.0 - nx*nx - ny*ny));
  vN = normalize(vec3(nx, ny, nz));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ── Fragment shader ───────────────────────────────────────────────────────────
// Physically-based approximation of glass:
//   · Snell's Law refraction via normal-driven UV offset
//   · Chromatic aberration (R/G/B sampled at slightly different offsets)
//   · Blinn-Phong specular from an overhead point light
//   · Fresnel rim glow (more reflective at glancing angles)
//   · Subtle brightness/saturation boost (glass amplifies perceived colour)
const FRAG = /* glsl */`
uniform sampler2D tBg;
uniform vec2      uSize;    // canvas px size
uniform float     uRefract; // refraction strength  (0.015–0.04)
uniform float     uCAb;     // chromatic aberration (0.008–0.02)

varying vec2 vUv;
varying vec3 vN;

void main() {
  vec3 n = vN;

  // Refraction offset in UV space
  vec2 off = n.xy * uRefract;

  // Background UV (flip Y: WebGL origin=bottom-left, texture origin=top-left)
  vec2 base = vUv;
  base.y = 1.0 - base.y;

  // Chromatic aberration: R shifted most, B least
  float r = texture2D(tBg, base + off * 1.00).r;
  float g = texture2D(tBg, base + off * (1.0 - uCAb)).g;
  float b = texture2D(tBg, base + off * (1.0 - uCAb * 2.0)).b;
  vec3 col = vec3(r, g, b);

  // Brightness + saturation boost (glass punch)
  col = pow(col, vec3(0.88)) * 1.12;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.35);

  // Specular highlight from simulated overhead light
  vec3 L = normalize(vec3(0.0, 1.0, 1.5));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), 48.0) * 0.75;
  col += vec3(spec);

  // Fresnel rim (edges glow whiter — matches iOS Liquid Glass edge highlights)
  float fresnel = pow(1.0 - abs(n.z), 3.0) * 0.35;
  col += vec3(fresnel * 0.75, fresnel * 0.85, fresnel);

  // Very subtle warm-white glass tint
  col = mix(col, vec3(0.96, 0.97, 1.0), 0.04);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 0.96);
}
`

interface Props {
  navRef: React.RefObject<HTMLElement | null>
}

export default function LiquidGlassCanvas({ navRef }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const glRef       = useRef<{
    renderer: import('three').WebGLRenderer
    scene:    import('three').Scene
    camera:   import('three').OrthographicCamera
    mat:      import('three').ShaderMaterial
  } | null>(null)
  const rafRef      = useRef<number>(0)
  const captureRef  = useRef(false)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef    = useRef(false)

  // ── Capture page behind nav → upload as Three.js texture ──────────────────
  const capture = useCallback(async () => {
    const nav = navRef.current
    const gl  = glRef.current
    if (!nav || !gl || captureRef.current) return
    captureRef.current = true

    try {
      const { default: html2canvas } = await import('html2canvas')
      const { CanvasTexture }        = await import('three')
      const rect = nav.getBoundingClientRect()

      // Hide nav so it doesn't appear in the captured background
      nav.style.opacity = '0'
      await new Promise<void>(r => requestAnimationFrame(() => r()))

      const shot = await html2canvas(document.documentElement, {
        scale:           0.6,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#16162a',
        x:               rect.left,
        y:               rect.top + window.scrollY,
        width:           rect.width,
        height:          rect.height,
        logging:         false,
        ignoreElements:  el => el === nav,
      })

      nav.style.opacity = ''

      const prev = gl.mat.uniforms.tBg.value as import('three').Texture | null
      const tex  = new CanvasTexture(shot)
      gl.mat.uniforms.tBg.value = tex
      prev?.dispose()

      // Fade in canvas on first capture
      if (!readyRef.current) {
        readyRef.current = true
        if (canvasRef.current) {
          canvasRef.current.style.transition = 'opacity 0.35s ease'
          canvasRef.current.style.opacity    = '1'
        }
      }
    } catch {
      if (navRef.current) navRef.current.style.opacity = ''
    } finally {
      captureRef.current = false
    }
  }, [navRef])

  // ── Initialise Three.js ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const nav    = navRef.current
    if (!canvas || !nav) return

    let running = true

    ;(async () => {
      const THREE = await import('three')
      if (!running) return

      const W = nav.offsetWidth
      const H = nav.offsetHeight

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(W, H)

      const scene  = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

      const mat = new THREE.ShaderMaterial({
        vertexShader:   VERT,
        fragmentShader: FRAG,
        uniforms: {
          tBg:      { value: new THREE.Texture() },
          uSize:    { value: new THREE.Vector2(W, H) },
          uRefract: { value: 0.028 },
          uCAb:     { value: 0.014 },
        },
        transparent: true,
      })

      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 48, 24), mat))
      glRef.current = { renderer, scene, camera, mat }

      const loop = () => {
        if (!running) return
        renderer.render(scene, camera)
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()

      // First capture
      await capture()
    })()

    // Re-capture (debounced) on scroll
    const onScroll = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(capture, 220)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      glRef.current?.renderer.dispose()
      window.removeEventListener('scroll', onScroll)
    }
  }, [navRef, capture])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        borderRadius:  'inherit',
        opacity:       0,   // fades in after first capture
      }}
    />
  )
}
