import { NextRequest } from 'next/server'

import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { serializeMeter } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)

    const meters = await getDb().meter.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 150,
    })

    return Response.json({
      meters: meters.map(meter => ({
        ...serializeMeter(meter),
        user: meter.user,
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}
