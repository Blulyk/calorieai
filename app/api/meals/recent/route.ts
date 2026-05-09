import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getRecentFoods } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const foods = getRecentFoods(session.userId, 6)
  return NextResponse.json({ foods })
}
