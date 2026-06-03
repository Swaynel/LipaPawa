import { NextRequest } from 'next/server'

import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)

    const transactions = await getDb().transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        meter: {
          select: {
            id: true,
            meterNumber: true,
            nickname: true,
          },
        },
        token: true,
      },
      take: 150,
    })

    return Response.json({
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        amount: transaction.amountCents / 100,
        units: transaction.units,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt.toISOString(),
        user: transaction.user,
        meter: transaction.meter,
        token: transaction.token
          ? {
              id: transaction.token.id,
              tokenValue: transaction.token.tokenValue,
              status: transaction.token.status,
            }
          : null,
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}
