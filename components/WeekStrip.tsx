'use client'

interface DayData { date: string; calories: number; meal_count: number }
interface Props { data: DayData[]; goal: number }

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function WeekStrip({ data, goal }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const statsMap = Object.fromEntries(data.map(d => [d.date, d]))

  // Build last 7 days Mon→Sun of current week
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday=0
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dow + i)
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="flex gap-1.5">
      {days.map((iso, i) => {
        const s = statsMap[iso]
        const isToday = iso === today
        const hasMeals = (s?.meal_count ?? 0) > 0
        const metGoal = s ? s.calories >= goal * 0.8 && s.calories <= goal * 1.15 : false
        const over = s ? s.calories > goal * 1.15 : false
        const isFuture = iso > today

        return (
          <div key={iso} className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl"
            style={{ background: isToday ? 'rgba(255,255,255,0.10)' : 'transparent', border: isToday ? '0.5px solid rgba(255,255,255,0.14)' : 'none' }}>
            <span className="text-[10px] font-semibold" style={{ color: isToday ? '#fff' : 'rgba(235,235,245,0.4)', letterSpacing: '0.05em' }}>
              {DIAS[i]}
            </span>
            <span className="text-base font-bold" style={{ color: isToday ? '#fff' : isFuture ? 'rgba(235,235,245,0.2)' : hasMeals ? '#fff' : 'rgba(235,235,245,0.35)' }}>
              {new Date(iso + 'T12:00:00').getDate()}
            </span>
            <div className="h-1.5 w-1.5 flex items-center justify-center">
              {hasMeals && !isFuture ? (
                <span className="block h-1.5 w-1.5 rounded-full"
                  style={{ background: over ? '#FF453A' : metGoal ? '#32D74B' : '#FF9F0A', boxShadow: `0 0 4px ${over ? '#FF453A' : metGoal ? '#32D74B' : '#FF9F0A'}` }} />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
