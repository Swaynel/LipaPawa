import { NextRequest } from 'next/server'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const user = await getDb().user.findFirst({
      where: {
        id: session.userId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    return Response.json({ user })
  } catch (error) {
    return jsonError(error)
  }
}
