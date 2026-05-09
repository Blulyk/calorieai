import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStreak } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const streak = getStreak(session.userId)
  return NextResponse.json({ streak })
}
