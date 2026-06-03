import { NextRequest } from 'next/server'

import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)

    const users = await getDb().user.findMany({
      orderBy: { createdAt: 'desc' },
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
      take: 100,
    })

    return Response.json({
      users: users.map(user => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}
