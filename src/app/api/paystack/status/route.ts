import { NextRequest } from 'next/server'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeTransaction } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { finalizePaystackPurchase } from '@/services/purchase-service'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const reference = new URL(request.url).searchParams.get('reference')

    if (!reference) {
      throw new ApiError(400, 'Payment reference is required')
    }

    const transaction = await getDb().transaction.findFirst({
      where: {
        paymentReference: reference,
        userId: session.userId,
      },
      include: {
        meter: true,
        token: true,
      },
    })

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found')
    }

    const refreshed =
      transaction.status === 'PENDING' && !transaction.token
        ? await finalizePaystackPurchase(reference)
        : transaction

    return Response.json({ transaction: serializeTransaction(refreshed) })
  } catch (error) {
    return jsonError(error)
  }
}
