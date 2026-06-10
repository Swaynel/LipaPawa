import { NextRequest } from 'next/server'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; shareId: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id, shareId } = await context.params
    const db = getDb()
    const meter = await db.meter.findFirst({ where: { id, userId: session.userId } })
    if (!meter) throw new ApiError(404, 'Meter not found')

    const deleted = await db.meterShare.deleteMany({
      where: { id: shareId, meterId: id },
    })

    if (deleted.count === 0) throw new ApiError(404, 'Share not found')

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.share_removed',
      entityType: 'meter',
      entityId: id,
      metadata: { shareId },
    })

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
