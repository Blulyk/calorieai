'use client'

interface DayData { date: string; calories: number; meal_count: number }
interface Props {
  data: DayData[]
  goal: number
  selected?: string
  onSelect?: (date: string) => void
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function WeekStrip({ data, goal, selected, onSelect }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const statsMap = Object.fromEntries(data.map(d => [d.date, d]))

  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dow + i)
    return d.toISOString().split('T')[0]
  })

  const activeDay = selected ?? today

  return (
    <div className="flex gap-1">
      {days.map((iso, i) => {
        const s = statsMap[iso]
        const isToday = iso === today
        const isSelected = iso === activeDay
        const hasMeals = (s?.meal_count ?? 0) > 0
        const metGoal = s ? s.calories >= goal * 0.8 && s.calories <= goal * 1.15 : false
        const over = s ? s.calories > goal * 1.15 : false
        const isFuture = iso > today
        const dotColor = over ? '#FF453A' : metGoal ? '#32D74B' : '#FF9F0A'

        return (
          <button
            key={iso}
            disabled={isFuture}
            onClick={() => !isFuture && onSelect?.(iso)}
            className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl"
            style={{
              background: isSelected
                ? 'rgba(255,255,255,0.14)'
                : 'transparent',
              border: isSelected
                ? '0.5px solid rgba(255,255,255,0.22)'
                : '0.5px solid transparent',
              cursor: isFuture ? 'default' : 'pointer',
              transition: 'background 0.2s, border-color 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              className="text-[10px] font-semibold"
              style={{
                color: isSelected ? '#fff' : isToday ? 'rgba(235,235,245,0.65)' : 'rgba(235,235,245,0.35)',
                letterSpacing: '0.05em',
              }}
            >
              {DIAS[i]}
            </span>
            <span
              className="text-base font-bold"
              style={{
                color: isSelected
                  ? '#fff'
                  : isFuture
                  ? 'rgba(235,235,245,0.2)'
                  : hasMeals
                  ? 'rgba(235,235,245,0.9)'
                  : 'rgba(235,235,245,0.35)',
              }}
            >
              {new Date(iso + 'T12:00:00').getDate()}
            </span>
            <div className="h-1.5 w-1.5 flex items-center justify-center">
              {hasMeals && !isFuture ? (
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: dotColor,
                    boxShadow: `0 0 5px ${dotColor}`,
                    opacity: isSelected ? 1 : 0.8,
                  }}
                />
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
