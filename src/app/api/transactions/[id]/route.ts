import { NextRequest } from 'next/server'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeTransaction } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN'
    const transaction = await getDb().transaction.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId: session.userId }),
      },
      include: {
        meter: true,
        token: true,
      },
    })

    if (!transaction) throw new ApiError(404, 'Transaction not found')

    return Response.json({ transaction: serializeTransaction(transaction) })
  } catch (error) {
    return jsonError(error)
  }
}
