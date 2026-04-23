import { NextResponse } from 'next/server'
import { createUser, getUserByEmail, getUserByUsername, countUsers } from '@/lib/db'
import { signToken, buildAuthCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

export async function POST(req: Request) {
  if (countUsers() === 0) {
    return NextResponse.json({ error: 'Complete initial setup first' }, { status: 403 })
  }
  const { username, email, password } = await req.json()
  if (!username || !email || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  if (getUserByEmail(email.trim().toLowerCase()) || getUserByUsername(username.trim())) {
    return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 })
  }
  const hash = await bcrypt.hash(password, 12)
  const id = uuid()
  createUser(id, username.trim(), email.trim().toLowerCase(), hash)
  const token = await signToken({ userId: id, username: username.trim() })
  const res = NextResponse.json({ ok: true, username: username.trim() })
  res.cookies.set(buildAuthCookie(token))
  return res
}
