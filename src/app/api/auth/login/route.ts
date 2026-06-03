import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  createSessionTokens,
  hashRefreshToken,
  verifyPassword,
} from '@/lib/auth'
import { getDb } from '@/lib/db'

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json())
    const db = getDb()
    const user = await db.user.findUnique({
      where: { email: input.email },
    })

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.isActive) {
      return Response.json({ error: 'Account is inactive' }, { status: 403 })
    }

    const { accessToken, refreshToken } = createSessionTokens(user)
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    })

    const response = NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    })
    response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * 60 * 12))
    response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 30))

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid login details' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Login failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
