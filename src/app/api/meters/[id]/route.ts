import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeMeter } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const updateMeterSchema = z.object({
  nickname: z.string().trim().max(80).optional().or(z.literal('')),
  address: z.string().trim().min(3).max(180).optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const meter = await getDb().meter.findFirst({
      where: {
        id,
        userId: session.userId,
        status: { not: 'INACTIVE' },
      },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    return Response.json({ meter: serializeMeter(meter) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const input = updateMeterSchema.parse(await request.json())
    const db = getDb()
    const meter = await db.meter.findFirst({
      where: { id, userId: session.userId, status: { not: 'INACTIVE' } },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    const updated = await db.meter.update({
      where: { id },
      data: {
        nickname: input.nickname === undefined ? undefined : input.nickname || null,
        address: input.address,
      },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.updated',
      entityType: 'meter',
      entityId: id,
    })

    return Response.json({ meter: serializeMeter(updated) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid meter details' }, { status: 400 })
    }

    return jsonError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const db = getDb()
    const meter = await db.meter.findFirst({
      where: { id, userId: session.userId, status: { not: 'INACTIVE' } },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    const updated = await db.meter.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.removed',
      entityType: 'meter',
      entityId: id,
    })

    return Response.json({ meter: serializeMeter(updated) })
  } catch (error) {
    return jsonError(error)
  }
}
