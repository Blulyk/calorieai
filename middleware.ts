import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth-edge'

const PUBLIC_API = ['/api/auth/login', '/api/auth/register', '/api/setup']
const PUBLIC_PAGES = ['/login', '/register', '/setup']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/icons') || pathname === '/manifest.json' || pathname.startsWith('/uploads')) {
    return NextResponse.next()
  }

  // Public API routes
  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Check setup state via a lightweight fetch to avoid importing DB in edge
  if (PUBLIC_PAGES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Protected routes
  const session = await getSessionFromRequest(req)
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
