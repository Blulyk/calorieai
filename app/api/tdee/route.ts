import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAdaptiveTDEE, getSettings } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = getAdaptiveTDEE(session.userId)
  const settings = getSettings(session.userId)
  return NextResponse.json({ adaptive: result, current_goal: settings?.calorie_goal || null })
}
