import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getSettings } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = getUserById(session.userId)
  const settings = getSettings(session.userId)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    settings,
  })
}
