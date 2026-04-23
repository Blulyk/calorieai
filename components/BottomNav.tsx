'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liquidGL: (opts: any) => { destroy(): void }
    html2canvas: unknown
    __liquidGLRenderer__: unknown
  }
}

const NAV = [
  {
    href: '/',
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand-400' : 'text-zinc-300'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/recetario',
    label: 'Recetario',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand-400' : 'text-zinc-300'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/log',
    label: '',
    special: true,
    icon: () => (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ background: '#f97316', boxShadow: '0 0 20px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' }}
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
    ),
  },
  {
    href: '/history',
    label: 'Historial',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand-400' : 'text-zinc-300'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-brand-400' : 'text-zinc-300'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

const NAV_CLASS = 'cai-bottom-nav'

export default function BottomNav() {
  const pathname    = usePathname()
  const instanceRef = useRef<{ destroy(): void } | null>(null)
  const navRef      = useRef<HTMLElement>(null)

  // liquidGL init
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const tryInit = () => {
      if (typeof window.liquidGL === 'undefined' || typeof window.html2canvas === 'undefined') {
        timer = setTimeout(tryInit, 120)
        return
      }
      instanceRef.current?.destroy?.()
      try {
        instanceRef.current = window.liquidGL({
          target:     `.${NAV_CLASS}`,
          snapshot:   'body',
          resolution: 1.8,
          refraction: 0.014,
          bevelDepth: 0.10,
          bevelWidth: 0.14,
          frost:      1.5,
          shadow:     false,
          specular:   true,
          reveal:     'fade',
          tilt:       false,
          magnify:    1,
        })
      } catch (e) {
        console.warn('liquidGL init failed', e)
      }
    }

    tryInit()
    return () => {
      clearTimeout(timer)
      instanceRef.current?.destroy?.()
      delete window.__liquidGLRenderer__
    }
  }, [])

  // Hide nav while scrolling so the static liquidGL snapshot doesn't glitch
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    let hideTimer: ReturnType<typeof setTimeout>
    let isHidden = false

    const hide = () => {
      if (!isHidden) {
        isHidden = true
        nav.style.opacity = '0'
        nav.style.transform = 'translateY(8px) scale(0.97)'
      }
      clearTimeout(hideTimer)
      hideTimer = setTimeout(show, 180)
    }

    const show = () => {
      isHidden = false
      nav.style.opacity = '1'
      nav.style.transform = ''
    }

    window.addEventListener('scroll', hide, { passive: true })
    return () => {
      window.removeEventListener('scroll', hide)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <nav
      ref={navRef}
      className={`${NAV_CLASS} fixed z-50`}
      data-liquid-ignore
      style={{
        bottom:       'max(16px, calc(env(safe-area-inset-bottom) + 10px))',
        left:         '10px',
        right:        '10px',
        maxWidth:     '540px',
        marginLeft:   'auto',
        marginRight:  'auto',
        height:       '64px',
        borderRadius: '9999px',
        background:   'transparent',
        transition:   'opacity 0.22s ease, transform 0.22s ease',
      }}
    >
      <div className="flex items-center justify-around h-full px-2 relative z-10">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-all active:scale-90 ${active && !item.special ? 'bg-white/10' : ''}`}
            >
              {item.icon(active)}
              {!item.special && (
                <span className={`text-[9px] font-semibold leading-none ${active ? 'text-brand-400' : 'text-zinc-400'}`}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
