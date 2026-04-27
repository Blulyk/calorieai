'use client'

interface DayData {
  date: string
  calories: number
  meal_count: number
  water_ml?: number
  water_glasses?: number
}

interface Props {
  data: DayData[]
  goal: number
}

export default function WeekChart({ data, goal }: Props) {
  const max = Math.max(goal * 1.3, ...data.map(d => d.calories), 100)

  return (
    <div className="flex items-end gap-1.5 h-28 px-1">
      {data.map(day => {
        const pct = (day.calories / max) * 100
        const over = day.calories > goal
        const isToday = day.date === new Date().toISOString().split('T')[0]
        const hasMeals = day.calories > 0
        const hasWater = (day.water_ml ?? 0) > 0
        const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex items-end justify-center" style={{ height: 88 }}>
              <div
                className="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                style={{
                  height: `${Math.max(hasMeals ? 8 : 2, pct)}%`,
                  background: over
                    ? 'linear-gradient(180deg, #ef4444, #dc2626)'
                    : isToday
                    ? 'linear-gradient(180deg, #4ade80, #22c55e)'
                    : hasMeals
                    ? 'linear-gradient(180deg, #27272a, #1a1a1a)'
                    : '#111',
                  boxShadow: isToday && hasMeals ? '0 0 12px #22c55e40' : 'none',
                }}
              />
            </div>
            <div className="h-1.5">
              {hasWater && <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.7)]" />}
            </div>
            <span className={`text-[10px] font-bold ${isToday ? 'text-brand-400' : 'text-zinc-700'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
