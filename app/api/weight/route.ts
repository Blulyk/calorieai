import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWeightLogs, logWeight } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = getWeightLogs(session.userId, 14)
  return NextResponse.json({ logs })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, weight_kg } = await req.json()
  if (!date || typeof weight_kg !== 'number' || weight_kg <= 0 || weight_kg > 500) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  logWeight(session.userId, date, weight_kg)
  return NextResponse.json({ ok: true })
}
