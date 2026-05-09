'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LEFT = [
  { href: '/', label: 'Inicio', icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.25h4.25v-5.5h4.5v5.5h4.25V10' },
  { href: '/recetario', label: 'Recetas', icon: 'M5 5.5c2.5-1.2 4.8-.9 7 1v13c-2.2-1.7-4.7-1.9-7-1V5.5Zm7 1c2.2-1.9 4.7-2.2 7-1v13c-2.3-.9-4.8-.7-7 1' },
]
const NAV_RIGHT = [
  // Full circle clock icon (two half-arcs) + clock hands
  { href: '/history', label: 'Historial', icon: 'M21 12A9 9 0 0 1 3 12A9 9 0 0 1 21 12M12 8v4l2.5 2' },
  { href: '/profile', label: 'Perfil', icon: 'M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM5 20c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const isLog = pathname === '/log'

  function TabBtn({ href, label, icon }: { href: string; label: string; icon: string }) {
    const active = pathname === href
    return (
      <Link
        href={href}
        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 select-none"
        style={{
          opacity: active ? 1 : 0.5,
          transition: 'opacity 0.2s, transform 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          width: 40,
          height: 26,
          borderRadius: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
          border: active ? '0.5px solid rgba(255,255,255,0.16)' : '0.5px solid transparent',
          transition: 'background 0.25s, border-color 0.25s',
        }}>
          <svg
            className="h-[18px] w-[18px] text-white"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            viewBox="0 0 24 24"
          >
            <path d={icon} />
          </svg>
        </div>
        <span
          className="text-[9.5px] font-semibold text-white"
          style={{ letterSpacing: '0.02em' }}
        >
          {label}
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="glass-nav fixed z-50"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        left: '12px',
        right: '12px',
        maxWidth: '520px',
        marginLeft: 'auto',
        marginRight: 'auto',
        height: '68px',
        borderRadius: '9999px',
        overflow: 'visible',
      }}
    >
      <div className="flex h-full items-center px-2">
        {/* Left tabs */}
        <div className="flex flex-1">
          {NAV_LEFT.map(t => <TabBtn key={t.href} {...t} />)}
        </div>

        {/* FAB */}
        <div className="relative flex w-16 flex-shrink-0 flex-col items-center" style={{ marginTop: -10 }}>
          <span style={{
            width: 5, height: 5, borderRadius: 3, marginBottom: 4, display: 'block',
            background: isLog ? '#0A84FF' : 'rgba(255,255,255,0.45)',
            boxShadow: isLog ? '0 0 8px #0A84FF' : 'none',
            transition: 'all 0.25s',
          }} />
          <Link
            href="/log"
            style={{ WebkitTapHighlightColor: 'transparent', display: 'block' }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: 'linear-gradient(180deg, #1F8FFF 0%, #0A6BE0 100%)',
              boxShadow: '0 0 0 4px rgba(10,10,11,0.7), 0 0 0 5px rgba(255,255,255,0.06), 0 8px 22px -4px rgba(10,132,255,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: isLog ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(.5,1.5,.4,1)',
            }}>
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Right tabs */}
        <div className="flex flex-1">
          {NAV_RIGHT.map(t => <TabBtn key={t.href} {...t} />)}
        </div>
      </div>

      <style>{`
        .glass-nav a:active > div { transform: scale(0.88) !important; }
      `}</style>
    </nav>
  )
}
