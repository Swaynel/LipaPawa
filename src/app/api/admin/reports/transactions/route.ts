import { NextRequest } from 'next/server'

import type { TransactionStatus } from '@/generated/prisma/enums'
import { jsonError, requireAdmin, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

const transactionStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'] as const

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    requireAdmin(session)
    const { searchParams } = new URL(request.url)
    const rawStatus = searchParams.get('status') || undefined
    const status = transactionStatuses.includes(rawStatus as TransactionStatus)
      ? rawStatus as TransactionStatus
      : undefined
    const paymentMethod = searchParams.get('paymentMethod') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const transactions = await getDb().transaction.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(paymentMethod && paymentMethod !== 'ALL' ? { paymentMethod } : {}),
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      include: { user: true, meter: true, token: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    })
    const rows = [
      ['Date', 'Transaction ID', 'Customer', 'Email', 'Meter', 'Amount', 'Units', 'Payment Method', 'Payment Reference', 'Status', 'Token Status'],
      ...transactions.map(tx => [
        tx.createdAt.toISOString(),
        tx.id,
        `${tx.user.firstName} ${tx.user.lastName}`,
        tx.user.email,
        tx.meter.meterNumber,
        String(tx.amountCents / 100),
        String(tx.units),
        tx.paymentMethod,
        tx.paymentReference ?? '',
        tx.status,
        tx.token?.status ?? '',
      ]),
    ]
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="transaction-reconciliation.csv"',
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}
