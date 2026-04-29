import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple password protection for demo/private access
// Set DEMO_PASSWORD in your .env.local file

const PASSWORD = process.env.DEMO_PASSWORD || 'taxdemo2026'
const COOKIE_NAME = 'taxproperty-auth'

export function middleware(request: NextRequest) {
  // Check if user is authenticated
  const authCookie = request.cookies.get(COOKIE_NAME)
  const isAuthenticated = authCookie?.value === 'true'

  // Allow access to private login page, API auth, and static files
  if (
    request.nextUrl.pathname === '/private' ||
    request.nextUrl.pathname === '/api/auth/simple' ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check for auth token in query string (for easy sharing)
  const authToken = request.nextUrl.searchParams.get('token')
  if (authToken === PASSWORD) {
    const response = NextResponse.redirect(new URL(request.nextUrl.pathname, request.url))
    response.cookies.set(COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    return response
  }

  // If not authenticated, redirect to private login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/private', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
