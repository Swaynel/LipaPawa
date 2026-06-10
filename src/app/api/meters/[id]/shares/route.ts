import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const shareSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['VIEWER', 'PURCHASER', 'MANAGER']),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    await assertOwner(id, session.userId)
    const shares = await getDb().meterShare.findMany({
      where: { meterId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({
      shares: shares.map(share => ({
        id: share.id,
        role: share.role,
        createdAt: share.createdAt.toISOString(),
        user: share.user,
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const input = shareSchema.parse(await request.json())
    const db = getDb()
    const meter = await db.meter.findFirst({ where: { id, userId: session.userId } })
    if (!meter) throw new ApiError(404, 'Meter not found')

    const user = await db.user.findUnique({ where: { email: input.email } })
    if (!user) throw new ApiError(404, 'User not found')
    if (user.id === session.userId) throw new ApiError(400, 'You already own this meter')

    const share = await db.meterShare.upsert({
      where: { meterId_userId: { meterId: id, userId: user.id } },
      update: { role: input.role },
      create: { meterId: id, userId: user.id, role: input.role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.shared',
      entityType: 'meter',
      entityId: id,
      metadata: { sharedWith: user.email, role: input.role },
    })

    return Response.json({
      share: {
        id: share.id,
        role: share.role,
        createdAt: share.createdAt.toISOString(),
        user: share.user,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid sharing details' }, { status: 400 })
    }

    return jsonError(error)
  }
}

async function assertOwner(meterId: string, userId: string) {
  const meter = await getDb().meter.findFirst({ where: { id: meterId, userId } })
  if (!meter) throw new ApiError(404, 'Meter not found')
}
