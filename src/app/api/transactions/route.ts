import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeTransaction } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { createSimulatedPurchase } from '@/services/purchase-service'

const createTransactionSchema = z.object({
  meterId: z.string().min(1),
  amount: z.coerce.number().min(10).max(100000),
  paymentMethod: z.string().trim().min(2).max(40).default('MPESA'),
})

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 50) || 50, 100)
    const transactions = await getDb().transaction.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        meter: true,
        token: true,
      },
    })

    return Response.json({ transactions: transactions.map(serializeTransaction) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = createTransactionSchema.parse(await request.json())
    const transaction = await createSimulatedPurchase({
      userId: session.userId,
      meterId: input.meterId,
      amountKes: input.amount,
      paymentMethod: input.paymentMethod,
    })

    return Response.json(
      { transaction: serializeTransaction(transaction) },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid transaction details' }, { status: 400 })
    }

    return jsonError(error)
  }
}
