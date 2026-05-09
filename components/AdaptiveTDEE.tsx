'use client'

interface Props {
  tdee: number
  confidence: 'high' | 'medium' | 'low'
  days: number
  currentGoal: number | null
  onAccept: (tdee: number) => void
}

const CONF_LABELS = { high: 'Alta precisión', medium: 'Precisión media', low: 'Datos insuficientes' }
const CONF_COLORS = { high: '#32D74B', medium: '#FF9F0A', low: '#FF453A' }

export default function AdaptiveTDEE({ tdee, confidence, days, currentGoal, onAccept }: Props) {
  const diff = currentGoal ? tdee - currentGoal : null

  return (
    <div className="glass rounded-[1.6rem] p-4" style={{ border: '0.5px solid rgba(125,122,255,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-3.5 w-3.5" fill="none" stroke="#7D7AFF" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7D7AFF' }}>TDEE adaptativo</span>
        <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${CONF_COLORS[confidence]}22`, color: CONF_COLORS[confidence] }}>
          {CONF_LABELS[confidence]}
        </span>
      </div>

      <p className="text-xs text-white/45 mb-3 leading-relaxed">
        Basado en {days} días de datos reales, tu metabolismo real es:
      </p>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-white tabular-nums">{tdee}</span>
        <span className="text-sm text-white/40">kcal/día</span>
        {diff !== null && (
          <span className="text-xs font-semibold ml-2" style={{ color: diff > 0 ? '#32D74B' : '#FF453A' }}>
            {diff > 0 ? '+' : ''}{diff} vs tu objetivo actual
          </span>
        )}
      </div>

      <button
        onClick={() => onAccept(tdee)}
        className="w-full rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(125,122,255,0.25), rgba(88,86,214,0.3))',
          color: '#A8A6FF',
          border: '0.5px solid rgba(125,122,255,0.3)',
        }}
      >
        Usar {tdee} kcal como objetivo
      </button>
    </div>
  )
}
