import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getAppUrl } from '@/lib/app-url'
import { CHECKOUT_PAYMENT_METHODS, PAYSTACK_PAYMENT_METHOD } from '@/lib/payment-methods'
import { serializeTransaction } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import {
  createPaystackPurchase,
  createSimulatedPurchase,
} from '@/services/purchase-service'

const createTransactionSchema = z.object({
  meterId: z.string().min(1),
  amount: z.coerce.number().min(10).max(100000),
  paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS).default('MPESA'),
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

    if (input.paymentMethod === PAYSTACK_PAYMENT_METHOD) {
      const appUrl = getAppUrl(request)
      const user = await getDb().user.findFirst({
        where: {
          id: session.userId,
          isActive: true,
        },
        select: {
          email: true,
        },
      })

      if (!user) {
        return Response.json({ error: 'Customer account is inactive' }, { status: 400 })
      }

      const { transaction, authorizationUrl } = await createPaystackPurchase({
        userId: session.userId,
        email: user.email,
        meterId: input.meterId,
        amountKes: input.amount,
        callbackUrl: new URL('/api/paystack/callback', appUrl).toString(),
      })

      return Response.json(
        { transaction: serializeTransaction(transaction), authorizationUrl },
        { status: 201 },
      )
    }

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
