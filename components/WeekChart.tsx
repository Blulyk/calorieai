'use client'

interface DayData {
  date: string
  calories: number
  meal_count: number
}

interface Props {
  data: DayData[]
  goal: number
}

export default function WeekChart({ data, goal }: Props) {
  const max = Math.max(goal * 1.3, ...data.map(d => d.calories), 100)

  return (
    <div className="flex items-end gap-2 h-24 px-1">
      {data.map(day => {
        const pct = (day.calories / max) * 100
        const over = day.calories > goal
        const isToday = day.date === new Date().toISOString().split('T')[0]
        const label = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  over ? 'bg-red-400' : isToday ? 'bg-brand-500' : 'bg-brand-200'
                }`}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${isToday ? 'text-brand-600' : 'text-ink-tertiary'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
