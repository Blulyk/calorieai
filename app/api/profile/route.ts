import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, updateSettings } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(getSettings(session.userId))
}

export async function PUT(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  updateSettings(session.userId, body)
  return NextResponse.json(getSettings(session.userId))
}
