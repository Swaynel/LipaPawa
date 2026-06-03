import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { serializeMeter } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const updateMeterStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)
    const { id } = await context.params
    const input = updateMeterStatusSchema.parse(await request.json())
    const db = getDb()
    const meter = await db.meter.update({
      where: { id },
      data: { status: input.status },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'admin.meter_status_updated',
      entityType: 'meter',
      entityId: id,
      metadata: input,
    })

    return Response.json({ meter: serializeMeter(meter) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid meter status' }, { status: 400 })
    }

    return jsonError(error)
  }
}
