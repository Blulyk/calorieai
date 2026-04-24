'use client'

interface MacroBarProps {
  label: string
  value: number
  goal: number
  color: string
  bg: string
  unit?: string
}

function MacroBar({ label, value, goal, color, bg, unit = 'g' }: MacroBarProps) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold text-zinc-200 tabular-nums">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <div className={`text-xs font-medium mt-1 text-right`} style={{ color: bg }}>
        of {goal}{unit}
      </div>
    </div>
  )
}

interface Props {
  protein: number
  carbs: number
  fat: number
  proteinGoal?: number
  carbsGoal?: number
  fatGoal?: number
}

export default function MacroBars({ protein, carbs, fat, proteinGoal = 130, carbsGoal = 250, fatGoal = 65 }: Props) {
  return (
    <div className="flex gap-5">
      <MacroBar label="Protein" value={protein} goal={proteinGoal} color="#818cf8" bg="#818cf840" />
      <MacroBar label="Carbs"   value={carbs}   goal={carbsGoal}   color="#fb923c" bg="#fb923c40" />
      <MacroBar label="Fat"     value={fat}      goal={fatGoal}     color="#f87171" bg="#f8717140" />
    </div>
  )
}
