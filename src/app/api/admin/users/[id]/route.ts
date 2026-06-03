import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)
    const { id } = await context.params
    const input = updateUserSchema.parse(await request.json())

    if (session.userId === id && input.isActive === false) {
      throw new ApiError(400, 'You cannot suspend your own account')
    }

    const db = getDb()
    const user = await db.user.update({
      where: { id },
      data: {
        isActive: input.isActive,
        role: input.role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            meters: true,
            transactions: true,
          },
        },
      },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'admin.user_updated',
      entityType: 'user',
      entityId: id,
      metadata: input,
    })

    return Response.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid user update' }, { status: 400 })
    }

    return jsonError(error)
  }
}
