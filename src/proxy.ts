import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const ACCESS_COOKIE = 'stima_access'
const REFRESH_COOKIE = 'stima_refresh'

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)

  const response = NextResponse.redirect(loginUrl)
  response.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 })
  response.cookies.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const hasRefreshCookie = Boolean(request.cookies.get(REFRESH_COOKIE)?.value)

  if (accessToken) {
    try {
      jwt.verify(accessToken, process.env.JWT_SECRET!)
      return NextResponse.next()
    } catch (error) {
      const canRefresh =
        error instanceof jwt.TokenExpiredError && hasRefreshCookie

      if (!canRefresh) {
        return redirectToLogin(request)
      }
    }
  }

  if (!accessToken && !hasRefreshCookie) {
    return redirectToLogin(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
