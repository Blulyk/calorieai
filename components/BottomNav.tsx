'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/',
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 transition-colors ${active ? 'text-brand-400' : 'text-zinc-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/recetario',
    label: 'Recetario',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 transition-colors ${active ? 'text-brand-400' : 'text-zinc-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/log',
    label: 'Añadir',
    special: true,
    icon: (_active: boolean) => (
      <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center active:scale-95 transition-transform" style={{ boxShadow: '0 0 20px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
    ),
  },
  {
    href: '/history',
    label: 'Historial',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 transition-colors ${active ? 'text-brand-400' : 'text-zinc-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 transition-colors ${active ? 'text-brand-400' : 'text-zinc-500'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed z-50 glass-nav" style={{ bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 12px))', left: '12px', right: '12px', borderRadius: '28px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="flex items-center justify-around px-1 py-2">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-2xl transition-all active:opacity-60 ${active && !item.special ? 'bg-white/5' : ''}`}>
              {item.icon(active)}
              {!item.special && (
                <span className={`text-[9px] font-semibold transition-colors ${active ? 'text-brand-400' : 'text-zinc-600'}`}>
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
