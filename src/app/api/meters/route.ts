import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeMeter } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const createMeterSchema = z.object({
  meterNumber: z.string().trim().min(6).max(32),
  nickname: z.string().trim().max(80).optional().or(z.literal('')),
  address: z.string().trim().min(3).max(180),
})

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const meters = await getDb().meter.findMany({
      where: {
        userId: session.userId,
        status: { not: 'INACTIVE' },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ meters: meters.map(serializeMeter) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = createMeterSchema.parse(await request.json())
    const db = getDb()
    const existing = await db.meter.findUnique({
      where: { meterNumber: input.meterNumber },
    })

    if (existing) {
      return Response.json({ error: 'Meter number is already registered' }, { status: 409 })
    }

    const meter = await db.meter.create({
      data: {
        userId: session.userId,
        meterNumber: input.meterNumber,
        nickname: input.nickname || null,
        address: input.address,
      },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.registered',
      entityType: 'meter',
      entityId: meter.id,
      metadata: { meterNumber: meter.meterNumber },
    })

    return Response.json({ meter: serializeMeter(meter) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid meter details' }, { status: 400 })
    }

    return jsonError(error)
  }
}
