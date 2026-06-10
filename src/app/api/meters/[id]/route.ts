import { NextRequest } from 'next/server'
import { z } from 'zod'

import { ApiError, jsonError, requireApiUser } from '@/lib/api-auth'
import { serializeMeter } from '@/lib/api-serializers'
import { getDb } from '@/lib/db'
import { createSimulatedPurchase } from '@/services/purchase-service'
import { writeAudit } from '@/services/audit-service'

const updateMeterSchema = z.object({
  nickname: z.string().trim().max(80).optional().or(z.literal('')),
  address: z.string().trim().min(3).max(180).optional(),
  automation: z.object({
    lowBalanceAlertEnabled: z.boolean(),
    lowBalanceThreshold: z.coerce.number().min(0).max(100000),
    autoTopUpEnabled: z.boolean(),
    autoTopUpThreshold: z.coerce.number().min(0).max(100000),
    autoTopUpAmount: z.coerce.number().min(10).max(100000).nullable(),
    autoTopUpPaymentMethod: z.string().trim().min(2).max(40),
  }).optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const meter = await getDb().meter.findFirst({
      where: {
        id,
        userId: session.userId,
        status: { not: 'INACTIVE' },
      },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    return Response.json({ meter: serializeMeter(meter) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const input = updateMeterSchema.parse(await request.json())
    const db = getDb()
    const meter = await db.meter.findFirst({
      where: { id, userId: session.userId, status: { not: 'INACTIVE' } },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    if (input.automation?.autoTopUpEnabled && !input.automation.autoTopUpAmount) {
      return Response.json(
        { error: 'Auto top-up amount is required when auto top-up is enabled' },
        { status: 400 },
      )
    }

    let updated = await db.meter.update({
      where: { id },
      data: {
        nickname: input.nickname === undefined ? undefined : input.nickname || null,
        address: input.address,
        lowBalanceAlertEnabled: input.automation?.lowBalanceAlertEnabled,
        lowBalanceThreshold: input.automation?.lowBalanceThreshold,
        autoTopUpEnabled: input.automation?.autoTopUpEnabled,
        autoTopUpThreshold: input.automation?.autoTopUpThreshold,
        autoTopUpAmountCents:
          input.automation?.autoTopUpAmount === undefined || input.automation?.autoTopUpAmount === null
            ? input.automation?.autoTopUpAmount === null ? null : undefined
            : Math.round(input.automation.autoTopUpAmount * 100),
        autoTopUpPaymentMethod: input.automation?.autoTopUpPaymentMethod,
      },
    })
    let autoTopUpTransactionId: string | null = null

    if (
      updated.autoTopUpEnabled &&
      updated.autoTopUpAmountCents &&
      updated.balanceUnits <= updated.autoTopUpThreshold
    ) {
      const autoTopUpTransaction = await createSimulatedPurchase({
        userId: session.userId,
        meterId: id,
        amountKes: updated.autoTopUpAmountCents / 100,
        paymentMethod: updated.autoTopUpPaymentMethod,
      })
      autoTopUpTransactionId = autoTopUpTransaction.id
      updated = await db.meter.update({
        where: { id },
        data: { lastAutoTopUpAt: new Date() },
      })
    }

    if (
      updated.lowBalanceAlertEnabled &&
      updated.balanceUnits <= updated.lowBalanceThreshold &&
      !autoTopUpTransactionId
    ) {
      const now = new Date()
      await db.notification.create({
        data: {
          userId: session.userId,
          channel: 'IN_APP',
          status: 'SENT',
          subject: 'Low meter balance',
          message: `Meter ${updated.meterNumber} is at ${updated.balanceUnits.toFixed(1)} kWh.`,
          sentAt: now,
        },
      })
      updated = await db.meter.update({
        where: { id },
        data: { lastLowBalanceAlertAt: now },
      })
    }

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.updated',
      entityType: 'meter',
      entityId: id,
      metadata: input.automation ? { automation: input.automation } : undefined,
    })

    return Response.json({
      meter: serializeMeter(updated),
      autoTopUpTransactionId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid meter details' }, { status: 400 })
    }

    return jsonError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = requireApiUser(request)
    const { id } = await context.params
    const db = getDb()
    const meter = await db.meter.findFirst({
      where: { id, userId: session.userId, status: { not: 'INACTIVE' } },
    })

    if (!meter) throw new ApiError(404, 'Meter not found')

    const updated = await db.meter.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    await writeAudit(db, {
      actorUserId: session.userId,
      action: 'meter.removed',
      entityType: 'meter',
      entityId: id,
    })

    return Response.json({ meter: serializeMeter(updated) })
  } catch (error) {
    return jsonError(error)
  }
}
