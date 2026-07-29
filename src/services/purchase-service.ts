import { getDb } from '@/lib/db'
import { PAYSTACK_PAYMENT_METHOD } from '@/lib/payment-methods'
import { writeAudit } from '@/services/audit-service'
import {
  createPaystackReference,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from '@/services/paystack-service'
import { applyTokenToSimulatedMeter } from '@/simulation/meter-simulator'
import { generateSimulatedToken } from '@/simulation/token-vendor'
import { simulatePayment } from '@/services/payment-service'
import type { Prisma } from '@/generated/prisma/client'

export const CENTS_PER_UNIT = 2000

export function calculateUnits(amountCents: number) {
  return Number((amountCents / CENTS_PER_UNIT).toFixed(2))
}

type PurchaseMeter = {
  id: string
  meterNumber: string
  balanceUnits: number
  status: string
}

type PurchasableMeter = PurchaseMeter & {
  user: {
    isActive: boolean
  }
}

type TxClient = Prisma.TransactionClient

async function resolvePurchasableMeter(tx: TxClient, input: {
  userId: string
  meterId: string
}) {
  const meter = await tx.meter.findFirst({
    where: {
      id: input.meterId,
      OR: [
        { userId: input.userId },
        {
          shares: {
            some: {
              userId: input.userId,
              role: { in: ['PURCHASER', 'MANAGER'] },
            },
          },
        },
      ],
    },
    include: {
      user: true,
    },
  })

  if (!meter) {
    throw new Error('Meter not found')
  }

  if (!meter.user.isActive) {
    throw new Error('Customer account is inactive')
  }

  return meter as PurchasableMeter
}

async function loadPurchaseTransaction(
  tx: TxClient,
  transactionId: string,
) {
  return tx.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      meter: true,
      token: true,
    },
  })
}

async function completeSuccessfulPurchase(
  tx: TxClient,
  input: {
    transactionId: string
    userId: string
    meter: PurchaseMeter
    amountCents: number
    paymentMethod: string
    paymentReference: string | null
  },
) {
  const units = calculateUnits(input.amountCents)
  const tokenValue = generateSimulatedToken({
    transactionId: input.transactionId,
    meterNumber: input.meter.meterNumber,
    units,
  })

  const token = await tx.token.create({
    data: {
      transactionId: input.transactionId,
      tokenValue,
      units,
      status: 'GENERATED',
    },
  })

  const meterResult = await applyTokenToSimulatedMeter(tx, {
    meterId: input.meter.id,
    tokenValue,
    units,
  })

  if (!meterResult.success) {
    await tx.token.update({
      where: { id: token.id },
      data: {
        status: 'FAILED',
        failureReason: meterResult.error,
        transmittedAt: new Date(),
      },
    })
    await tx.transaction.update({
      where: { id: input.transactionId },
      data: {
        status: 'FAILED',
        failureReason: meterResult.error,
      },
    })
    await writeAudit(tx, {
      actorUserId: input.userId,
      action: 'purchase.meter_apply_failed',
      entityType: 'transaction',
      entityId: input.transactionId,
      metadata: {
        meterId: input.meter.id,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        reason: meterResult.error,
      },
    })
  } else {
    await tx.meter.update({
      where: { id: input.meter.id },
      data: { balanceUnits: meterResult.newBalance },
    })
    await tx.token.update({
      where: { id: token.id },
      data: {
        status: 'APPLIED',
        transmittedAt: new Date(),
        appliedAt: new Date(),
      },
    })
    await tx.transaction.update({
      where: { id: input.transactionId },
      data: {
        status: 'COMPLETED',
      },
    })
    await tx.notification.create({
      data: {
        userId: input.userId,
        transactionId: input.transactionId,
        channel: 'IN_APP',
        status: 'SENT',
        subject: 'Electricity purchase confirmed',
        message: `${units} kWh applied to meter ${input.meter.meterNumber}.`,
        sentAt: new Date(),
      },
    })
    await writeAudit(tx, {
      actorUserId: input.userId,
      action: 'purchase.completed',
      entityType: 'transaction',
      entityId: input.transactionId,
      metadata: {
        meterId: input.meter.id,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        tokenId: token.id,
        units,
      },
    })
  }

  return loadPurchaseTransaction(tx, input.transactionId)
}

export async function createSimulatedPurchase(input: {
  userId: string
  meterId: string
  amountKes: number
  paymentMethod: string
}) {
  const amountCents = Math.round(input.amountKes * 100)

  if (!Number.isFinite(input.amountKes) || amountCents < 1000) {
    throw new Error('Minimum purchase amount is KES 10')
  }

  const payment = await simulatePayment({
    amountCents,
    paymentMethod: input.paymentMethod,
  })

  const db = getDb()

  return db.$transaction(async tx => {
    const meter = await resolvePurchasableMeter(tx, {
      userId: input.userId,
      meterId: input.meterId,
    })

    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        meterId: meter.id,
        amountCents,
        units: calculateUnits(amountCents),
        status: payment.success ? 'PENDING' : 'FAILED',
        paymentMethod: input.paymentMethod,
        paymentReference: payment.reference,
        failureReason: payment.failureReason,
      },
    })

    if (!payment.success) {
      await writeAudit(tx, {
        actorUserId: input.userId,
        action: 'purchase.payment_failed',
        entityType: 'transaction',
        entityId: transaction.id,
        metadata: {
          paymentMethod: input.paymentMethod,
          reason: payment.failureReason,
        },
      })

      return loadPurchaseTransaction(tx, transaction.id)
    }

    return completeSuccessfulPurchase(tx, {
      transactionId: transaction.id,
      userId: input.userId,
      meter,
      amountCents,
      paymentMethod: input.paymentMethod,
      paymentReference: payment.reference,
    })
  })
}

export async function createPaystackPurchase(input: {
  userId: string
  email: string
  meterId: string
  amountKes: number
  callbackUrl: string
}) {
  const amountCents = Math.round(input.amountKes * 100)

  if (!Number.isFinite(input.amountKes) || amountCents < 1000) {
    throw new Error('Minimum purchase amount is KES 10')
  }

  const db = getDb()
  const paymentReference = createPaystackReference()

  const transaction = await db.$transaction(async tx => {
    const meter = await resolvePurchasableMeter(tx, {
      userId: input.userId,
      meterId: input.meterId,
    })

    const created = await tx.transaction.create({
      data: {
        userId: input.userId,
        meterId: meter.id,
        amountCents,
        units: calculateUnits(amountCents),
        status: 'PENDING',
        paymentMethod: PAYSTACK_PAYMENT_METHOD,
        paymentReference,
      },
    })

    await writeAudit(tx, {
      actorUserId: input.userId,
      action: 'purchase.initiated',
      entityType: 'transaction',
      entityId: created.id,
      metadata: {
        paymentMethod: PAYSTACK_PAYMENT_METHOD,
        paymentReference,
      },
    })

    return loadPurchaseTransaction(tx, created.id)
  })

  try {
    const paystackTransaction = await initializePaystackTransaction({
      amountCents,
      email: input.email,
      reference: paymentReference,
      callbackUrl: input.callbackUrl,
      metadata: {
        transactionId: transaction.id,
        meterId: input.meterId,
        userId: input.userId,
        paymentMethod: PAYSTACK_PAYMENT_METHOD,
        cancel_action: `${new URL(input.callbackUrl).origin}/dashboard/purchase?payment=cancelled`,
      },
    })

    if (paystackTransaction.reference !== paymentReference) {
      await db.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentReference: paystackTransaction.reference,
        },
      })
    }

    const refreshedTransaction = await loadPurchaseTransaction(
      db,
      transaction.id,
    )

    return {
      transaction: refreshedTransaction,
      authorizationUrl: paystackTransaction.authorization_url,
      accessCode: paystackTransaction.access_code,
      reference: paystackTransaction.reference,
    }
  } catch (error) {
    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        failureReason:
          error instanceof Error ? error.message : 'Paystack initialization failed',
      },
    })

    await writeAudit(db, {
      actorUserId: input.userId,
      action: 'purchase.payment_failed',
      entityType: 'transaction',
      entityId: transaction.id,
      metadata: {
        paymentMethod: PAYSTACK_PAYMENT_METHOD,
        reason: error instanceof Error ? error.message : 'Paystack initialization failed',
      },
    })

    throw error
  }
}

export async function finalizePaystackPurchase(reference: string) {
  const db = getDb()
  const existing = await db.transaction.findUnique({
    where: { paymentReference: reference },
    include: {
      meter: {
        include: {
          user: true,
        },
      },
      token: true,
    },
  })

  if (!existing) {
    throw new Error('Transaction not found')
  }

  if (existing.token) {
    return existing
  }

  const verification = await verifyPaystackTransaction(reference)

  if (verification.status !== 'success') {
    return db.$transaction(async tx => {
      await tx.transaction.update({
        where: { id: existing.id },
        data: {
          status: 'FAILED',
          failureReason:
            verification.gateway_response ||
            verification.message ||
            'Paystack payment was not successful',
        },
      })

      await writeAudit(tx, {
        action: 'purchase.payment_failed',
        entityType: 'transaction',
        entityId: existing.id,
        metadata: {
          paymentMethod: existing.paymentMethod,
          paymentReference: reference,
          reason:
            verification.gateway_response ||
            verification.message ||
            'Paystack payment was not successful',
        },
      })

      return loadPurchaseTransaction(tx, existing.id)
    })
  }

  return db.$transaction(async tx => {
    const transaction = await tx.transaction.findUnique({
      where: { id: existing.id },
      include: {
        meter: true,
        token: true,
      },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.token) {
      return transaction
    }

    return completeSuccessfulPurchase(tx, {
      transactionId: transaction.id,
      userId: transaction.userId,
      meter: transaction.meter as PurchaseMeter,
      amountCents: transaction.amountCents,
      paymentMethod: transaction.paymentMethod,
      paymentReference: transaction.paymentReference,
    })
  })
}
