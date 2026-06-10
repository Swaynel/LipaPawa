import { NextRequest } from 'next/server'

import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)
    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get('days') ?? 30) || 30, 365)
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    start.setHours(0, 0, 0, 0)
    const transactions = await getDb().transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        meter: { select: { id: true, meterNumber: true, nickname: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const daily = new Map<string, { date: string; revenue: number; transactions: number }>()
    const customers = new Map<string, { name: string; email: string; revenue: number }>()
    const meters = new Map<string, { meterNumber: string; nickname: string | null; revenue: number }>()

    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().slice(0, 10)
      const amount = tx.amountCents / 100
      const day = daily.get(date) ?? { date, revenue: 0, transactions: 0 }
      day.revenue += amount
      day.transactions += 1
      daily.set(date, day)

      const customer = customers.get(tx.user.id) ?? {
        name: `${tx.user.firstName} ${tx.user.lastName}`,
        email: tx.user.email,
        revenue: 0,
      }
      customer.revenue += amount
      customers.set(tx.user.id, customer)

      const meter = meters.get(tx.meter.id) ?? {
        meterNumber: tx.meter.meterNumber,
        nickname: tx.meter.nickname,
        revenue: 0,
      }
      meter.revenue += amount
      meters.set(tx.meter.id, meter)
    }

    return Response.json({
      summary: {
        revenue: transactions.reduce((sum, tx) => sum + tx.amountCents / 100, 0),
        transactions: transactions.length,
        averageTransaction:
          transactions.length === 0
            ? 0
            : transactions.reduce((sum, tx) => sum + tx.amountCents / 100, 0) / transactions.length,
      },
      daily: Array.from(daily.values()).map(point => ({
        ...point,
        revenue: Number(point.revenue.toFixed(2)),
      })),
      topCustomers: Array.from(customers.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topMeters: Array.from(meters.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    })
  } catch (error) {
    return jsonError(error)
  }
}
