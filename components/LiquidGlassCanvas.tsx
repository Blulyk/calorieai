'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liquidGL: (opts: Record<string, unknown>) => { destroy(): void }
    html2canvas: unknown
  }
}

interface Props {
  navRef: React.RefObject<HTMLElement | null>
}

export default function LiquidGlassCanvas({ navRef }: Props) {
  const instanceRef = useRef<{ destroy(): void } | null>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    // Wait for both scripts to be ready
    const init = () => {
      if (!window.liquidGL || !window.html2canvas) {
        setTimeout(init, 80)
        return
      }
      try {
        // Add the class liquidGL expects
        nav.classList.add('liquidGL-nav')

        instanceRef.current = window.liquidGL({
          target:     '.liquidGL-nav',
          snapshot:   'body',
          resolution: 1.5,
          refraction: 0.018,
          bevelDepth: 0.12,
          bevelWidth: 0.18,
          frost:      0,
          shadow:     false,
          tilt:       false,
          magnify:    1,
        })
      } catch {
        // silently fall back to CSS glass
      }
    }

    init()

    return () => {
      instanceRef.current?.destroy()
      navRef.current?.classList.remove('liquidGL-nav')
    }
  }, [navRef])

  // liquidGL manages its own canvas — nothing to render here
  return null
}
