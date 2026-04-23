import { NextResponse } from 'next/server'
import { countUsers, createUser } from '@/lib/db'
import { signToken, buildAuthCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

export async function GET() {
  const count = countUsers()
  return NextResponse.json({ needsSetup: count === 0 })
}

export async function POST(req: Request) {
  if (countUsers() > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 409 })
  }
  const { username, email, password } = await req.json()
  if (!username || !email || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  const hash = await bcrypt.hash(password, 12)
  const id = uuid()
  try {
    createUser(id, username.trim(), email.trim().toLowerCase(), hash)
  } catch {
    return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 })
  }
  const token = await signToken({ userId: id, username: username.trim() })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(buildAuthCookie(token))
  return res
}
