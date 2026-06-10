import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonError, requireApiUser } from '@/lib/api-auth'
import { getDb } from '@/lib/db'
import { writeAudit } from '@/services/audit-service'

const scheduledPurchaseSchema = z.object({
  meterId: z.string().min(1),
  amount: z.coerce.number().min(10).max(100000),
  paymentMethod: z.string().trim().min(2).max(40),
  frequency: z.enum(['WEEKLY', 'MONTHLY']),
  dayOfWeek: z.coerce.number().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().min(1).max(28).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const schedules = await getDb().scheduledPurchase.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { meter: true },
    })

    return Response.json({
      scheduledPurchases: schedules.map(schedule => ({
        id: schedule.id,
        meterId: schedule.meterId,
        meter: {
          meterNumber: schedule.meter.meterNumber,
          nickname: schedule.meter.nickname,
        },
        amount: schedule.amountCents / 100,
        paymentMethod: schedule.paymentMethod,
        frequency: schedule.frequency,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        nextRunAt: schedule.nextRunAt.toISOString(),
        isActive: schedule.isActive,
      })),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireApiUser(request)
    const input = scheduledPurchaseSchema.parse(await request.json())
    const db = getDb()
    const meter = await db.meter.findFirst({
      where: {
        id: input.meterId,
        OR: [
          { userId: session.userId },
          { shares: { some: { userId: session.userId, role: { in: ['PURCHASER', 'MANAGER'] } } } },
        ],
      },
    })

    if (!meter) {
      return Response.json({ error: 'Meter not found or not purchasable' }, { status: 404 })
    }

    const schedule = await db.scheduledPurchase.create({
      data: {
        userId: session.userId,
        meterId: input.meterId,
        amountCents: Math.round(input.amount * 100),
        paymentMethod: input.paymentMethod,
        frequency: input.frequency,
        dayOfWeek: input.frequency === 'WEEKLY' ? input.dayOfWeek ?? new Date().getDay() : null,
        dayOfMonth: input.frequency === 'MONTHLY' ? input.dayOfMonth ?? new Date().getDate() : null,
        nextRunAt: getNextRunAt(input.frequency, input.dayOfWeek, input.dayOfMonth),
      },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'scheduled_purchase.created',
      entityType: 'scheduled_purchase',
      entityId: schedule.id,
      metadata: { meterId: input.meterId, amount: input.amount, frequency: input.frequency },
    })

    return Response.json({ scheduledPurchase: schedule }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid scheduled purchase details' }, { status: 400 })
    }

    return jsonError(error)
  }
}

function getNextRunAt(
  frequency: 'WEEKLY' | 'MONTHLY',
  dayOfWeek?: number,
  dayOfMonth?: number,
) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(8, 0, 0, 0)

  if (frequency === 'WEEKLY') {
    const targetDay = dayOfWeek ?? now.getDay()
    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7
    next.setDate(now.getDate() + daysUntil)
    return next
  }

  const targetDate = Math.min(dayOfMonth ?? now.getDate(), 28)
  next.setDate(targetDate)
  if (next <= now) next.setMonth(next.getMonth() + 1)
  return next
}
