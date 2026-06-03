import { NextRequest, NextResponse } from 'next/server'

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const currentRefreshToken = body.refreshToken ?? request.cookies.get(REFRESH_COOKIE)?.value

  if (!currentRefreshToken) {
    return Response.json({ error: 'Refresh token required' }, { status: 401 })
  }

  const db = getDb()
  const stored = await db.refreshToken.findFirst({
    where: {
      tokenHash: hashRefreshToken(currentRefreshToken),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  if (!stored || !stored.user.isActive) {
    return Response.json({ error: 'Invalid refresh token' }, { status: 401 })
  }

  const accessToken = signAccessToken({
    userId: stored.user.id,
    role: stored.user.role,
    email: stored.user.email,
  })
  const refreshToken = createRefreshToken()

  await db.$transaction([
    db.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    db.refreshToken.create({
      data: {
        userId: stored.user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    }),
  ])

  const response = NextResponse.json({ accessToken, refreshToken })
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * 60 * 12))
  response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 30))
  return response
}
