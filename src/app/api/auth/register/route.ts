import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  createSessionTokens,
  hashPassword,
  hashRefreshToken,
} from '@/lib/auth'
import { getDb } from '@/lib/db'

const registerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(7),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const input = registerSchema.parse(await request.json())
    const db = getDb()
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: input.email }, { phone: input.phone }],
      },
    })

    if (existing) {
      return Response.json(
        { error: 'Email or phone is already registered' },
        { status: 409 },
      )
    }

    const userCount = await db.user.count()
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'CUSTOMER'
    const user = await db.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        role,
        isVerified: true,
      },
    })
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
      return Response.json({ error: 'Invalid registration details' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Registration failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
