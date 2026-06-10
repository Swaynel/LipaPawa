import { NextRequest } from 'next/server'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const { searchParams } = new URL(request.url)
    const meterId = searchParams.get('meterId') || undefined
    const days = Math.min(Number(searchParams.get('days') ?? 30) || 30, 90)
    const start = new Date()
    start.setDate(start.getDate() - days + 1)
    start.setHours(0, 0, 0, 0)

    const meters = await getDb().meter.findMany({
      where: {
        ...(meterId ? { id: meterId } : {}),
        OR: [
          { userId: session.userId },
          { shares: { some: { userId: session.userId } } },
        ],
      },
      include: {
        usageSamples: {
          where: { sampledAt: { gte: start } },
          orderBy: { sampledAt: 'asc' },
        },
        transactions: {
          where: {
            status: 'COMPLETED',
            createdAt: { gte: start },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    const series = buildDailySeries(days, meters.flatMap(meter => {
      if (meter.usageSamples.length > 0) {
        return meter.usageSamples.map(sample => ({
          date: sample.sampledAt,
          units: sample.unitsUsed,
        }))
      }

      return meter.transactions.map(transaction => ({
        date: transaction.createdAt,
        units: Number((transaction.units * 0.62).toFixed(2)),
      }))
    }))
    const totalUsage = series.reduce((sum, point) => sum + point.units, 0)

    return Response.json({
      meters: meters.map(meter => ({
        id: meter.id,
        meterNumber: meter.meterNumber,
        nickname: meter.nickname,
      })),
      series,
      summary: {
        totalUsage: Number(totalUsage.toFixed(2)),
        averageDailyUsage: Number((totalUsage / days).toFixed(2)),
        peakDay: series.reduce((peak, point) => point.units > peak.units ? point : peak, series[0] ?? { date: null, units: 0 }),
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}

function buildDailySeries(days: number, samples: Array<{ date: Date; units: number }>) {
  const map = new Map<string, number>()
  const today = new Date()

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - index)
    const key = date.toISOString().slice(0, 10)
    map.set(key, 0)
  }

  for (const sample of samples) {
    const key = sample.date.toISOString().slice(0, 10)
    if (map.has(key)) {
      map.set(key, Number(((map.get(key) ?? 0) + sample.units).toFixed(2)))
    }
  }

  return Array.from(map.entries()).map(([date, units]) => ({ date, units }))
}
