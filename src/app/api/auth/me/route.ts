import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(32),
})

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  isVerified: true,
  createdAt: true,
} as const

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const user = await getDb().user.findFirst({
      where: {
        id: session.userId,
        isActive: true,
      },
      select: userSelect,
    })

    return Response.json({ user })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = updateProfileSchema.parse(await request.json())
    const db = getDb()
    const existingPhone = await db.user.findFirst({
      where: {
        phone: input.phone,
        id: { not: session.userId },
      },
      select: { id: true },
    })

    if (existingPhone) {
      throw new ApiError(409, 'Phone number is already in use')
    }

    const user = await db.user.update({
      where: { id: session.userId },
      data: input,
      select: userSelect,
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'profile.updated',
      entityType: 'user',
      entityId: session.userId,
      metadata: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    })

    return Response.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid profile details' }, { status: 400 })
    }

    return jsonError(error)
  }
}
