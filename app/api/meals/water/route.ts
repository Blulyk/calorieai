import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setWater } from '@/lib/db'
import { todayString } from '@/lib/nutrition'

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date, glasses } = await req.json()
  setWater(session.userId, date || todayString(), glasses)
  return NextResponse.json({ ok: true })
}
