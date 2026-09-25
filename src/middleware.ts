import { NextResponse, type NextRequest } from 'next/server'

// Routes that legitimately receive cross-site POSTs (signed webhooks, NextAuth's own CSRF flow, cron).
const EXEMPT = ['/api/billing/webhook/', '/api/auth/', '/api/cron/']
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF defence in depth: state-changing API requests must come from our own origin.
 * (Session cookies are also SameSite=Lax, and APIs only accept JSON bodies.)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (SAFE_METHODS.has(request.method) || EXEMPT.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (origin) {
    let originHost: string | null = null
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = null
    }
    if (!originHost || originHost !== host) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } },
        { status: 403 }
      )
    }
  }
  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
