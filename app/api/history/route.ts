import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWeeklyStats, getMonthMealDates } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'week'

  if (type === 'month') {
    const yearMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const dates = getMonthMealDates(session.userId, yearMonth)
    return NextResponse.json({ dates: dates.map(d => d.date) })
  }

  const start = searchParams.get('start') || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
  const end = searchParams.get('end') || new Date().toISOString().split('T')[0]
  const stats = getWeeklyStats(session.userId, start, end)
  return NextResponse.json({ stats })
}
