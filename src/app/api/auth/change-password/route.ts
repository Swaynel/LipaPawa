import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = changePasswordSchema.parse(await request.json())
    const db = getDb()
    const user = await db.user.findFirst({
      where: {
        id: session.userId,
        isActive: true,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user) throw new ApiError(404, 'User not found')

    const passwordMatches = await verifyPassword(input.currentPassword, user.passwordHash)
    if (!passwordMatches) {
      throw new ApiError(400, 'Current password is incorrect')
    }

    await db.$transaction(async tx => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.newPassword) },
      })
      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      })
      await writeAudit(tx, {
        actorUserId: user.id,
        action: 'profile.password_changed',
        entityType: 'user',
        entityId: user.id,
      })
    })

    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid password details' }, { status: 400 })
    }

    return jsonError(error)
  }
}
