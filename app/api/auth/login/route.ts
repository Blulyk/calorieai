import { NextResponse } from 'next/server'
import { getUserByEmail, getUserByUsername } from '@/lib/db'
import { signToken, buildAuthCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { identifier, password } = await req.json()
  if (!identifier || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  const user = getUserByEmail(identifier.toLowerCase()) ?? getUserByUsername(identifier)
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const token = await signToken({ userId: user.id, username: user.username })
  const res = NextResponse.json({ ok: true, username: user.username })
  res.cookies.set(buildAuthCookie(token))
  return res
}
