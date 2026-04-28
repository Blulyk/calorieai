'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/',
    label: 'Inicio',
    icon: 'M3 11.5 12 4l9 7.5M5.5 10v9.25h4.25v-5.5h4.5v5.5h4.25V10',
  },
  {
    href: '/recetario',
    label: 'Recetas',
    icon: 'M5 5.5c2.5-1.2 4.8-.9 7 1v13c-2.2-1.7-4.7-1.9-7-1V5.5Zm7 1c2.2-1.9 4.7-2.2 7-1v13c-2.3-.9-4.8-.7-7 1',
  },
  {
    href: '/log',
    label: '',
    special: true,
    icon: 'M12 5v14m7-7H5',
  },
  {
    href: '/history',
    label: 'Historial',
    icon: 'M4 19V9m5 10V5m5 14v-7m5 7V7',
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: 'M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM5 20c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5',
  },
]

export default function BottomNav() {
  const pathname = usePathname()

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
      }}
    >
      <div className="flex h-full items-center justify-between px-2">
        {NAV.map(item => {
          const active = pathname === item.href
          const isLog = item.special

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex h-[56px] w-[58px] flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-full transition-all active:scale-95 ${
                active && !isLog ? 'text-white' : 'text-zinc-400'
              }`}
            >
              {active && !isLog && (
                <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/12" />
              )}

              {isLog ? (
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0071e3] text-white ${active ? 'ring-4 ring-[#0071e3]/24' : ''}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} viewBox="0 0 24 24">
                    <path d={item.icon} />
                  </svg>
                </span>
              ) : (
                <>
                  <svg className="relative h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} viewBox="0 0 24 24">
                    <path d={item.icon} />
                  </svg>
                  <span className="relative text-[10px] font-semibold leading-none">{item.label}</span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
