// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Skip middleware for API routes, static files, and public assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/flow') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const token = req.cookies.get('sb-access-token')?.value

  // Allow the app shell to load unauthenticated; client-side auth will redirect if needed.
  // If already authenticated, keep users on the app instead of the login page.
  if (token && pathname === '/login') {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login']
}
