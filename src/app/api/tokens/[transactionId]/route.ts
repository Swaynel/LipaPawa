import { NextRequest } from 'next/server'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transactionId: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { transactionId } = await context.params
    const token = await getDb().token.findFirst({
      where: {
        transactionId,
        transaction: {
          userId: session.userId,
        },
      },
      include: {
        transaction: {
          include: {
            meter: true,
          },
        },
      },
    })

    if (!token) throw new ApiError(404, 'Token not found')

    return Response.json({
      token: {
        id: token.id,
        tokenValue: token.tokenValue,
        units: token.units,
        status: token.status,
        createdAt: token.createdAt.toISOString(),
        transmittedAt: token.transmittedAt?.toISOString() ?? null,
        appliedAt: token.appliedAt?.toISOString() ?? null,
        transaction: {
          id: token.transaction.id,
          amount: token.transaction.amountCents / 100,
          status: token.transaction.status,
          paymentReference: token.transaction.paymentReference,
          meter: {
            meterNumber: token.transaction.meter.meterNumber,
            nickname: token.transaction.meter.nickname,
          },
        },
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
