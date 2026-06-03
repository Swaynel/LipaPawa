import { NextRequest, NextResponse } from 'next/server'

const ACCESS_COOKIE = 'stima_access'
const REFRESH_COOKIE = 'stima_refresh'

export function proxy(request: NextRequest) {
  const hasAccessCookie = Boolean(request.cookies.get(ACCESS_COOKIE)?.value)
  const hasRefreshCookie = Boolean(request.cookies.get(REFRESH_COOKIE)?.value)

  if (!hasAccessCookie && !hasRefreshCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
