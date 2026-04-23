import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'calorieai-dev-secret-change-in-production-please'
)
const COOKIE = 'calorieai_token'
const EXPIRES = 60 * 60 * 24 * 30 // 30 days

export async function signToken(payload: { userId: string; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; username: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export function buildAuthCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: EXPIRES,
    path: '/',
  }
}

export function clearAuthCookie() {
  return {
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }
}
