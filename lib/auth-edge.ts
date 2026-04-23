import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'calorieai-dev-secret-change-in-production-please'
)

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; username: string }
  } catch {
    return null
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('calorieai_token')?.value
  if (!token) return null
  return verifyToken(token)
}
