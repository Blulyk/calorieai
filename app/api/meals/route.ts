import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMealsByDate, getDailyStats, getWater } from '@/lib/db'
import { todayString } from '@/lib/nutrition'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || todayString()

  const meals = getMealsByDate(session.userId, date)
  const stats = getDailyStats(session.userId, date)
  const water = getWater(session.userId, date)

  const parsed = meals.map(m => ({ ...m, foods: JSON.parse(m.foods) }))
  return NextResponse.json({ meals: parsed, stats, water, date })
}
