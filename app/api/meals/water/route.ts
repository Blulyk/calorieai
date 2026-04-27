import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setWater, setWaterMl } from '@/lib/db'
import { todayString } from '@/lib/nutrition'

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date, glasses, water_ml } = await req.json()
  const targetDate = typeof date === 'string' ? date : todayString()

  if (Number.isFinite(Number(water_ml))) {
    const ml = Math.max(0, Math.min(10000, Math.trunc(Number(water_ml))))
    setWaterMl(session.userId, targetDate, ml)
    return NextResponse.json({ ok: true, water_ml: ml, glasses: Math.round(ml / 250) })
  }

  const safeGlasses = Math.max(0, Math.min(40, Math.trunc(Number(glasses) || 0)))
  setWater(session.userId, targetDate, safeGlasses)
  return NextResponse.json({ ok: true, water_ml: safeGlasses * 250, glasses: safeGlasses })
}
