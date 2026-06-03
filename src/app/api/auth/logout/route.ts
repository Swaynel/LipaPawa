import { NextRequest, NextResponse } from 'next/server'

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  hashRefreshToken,
} from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    await getDb().refreshToken.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ACCESS_COOKIE, '', cookieOptions(0))
  response.cookies.set(REFRESH_COOKIE, '', cookieOptions(0))
  return response
}
