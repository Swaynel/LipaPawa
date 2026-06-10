import { getDb } from "@/lib/db";
import { writeAudit } from "@/services/audit-service";
import { simulatePayment } from "@/services/payment-service";
import { applyTokenToSimulatedMeter } from "@/simulation/meter-simulator";
import { generateSimulatedToken } from "@/simulation/token-vendor";

export const CENTS_PER_UNIT = 2000;

export function calculateUnits(amountCents: number) {
  return Number((amountCents / CENTS_PER_UNIT).toFixed(2));
}

export async function createSimulatedPurchase(input: {
  userId: string;
  meterId: string;
  amountKes: number;
  paymentMethod: string;
}) {
  const amountCents = Math.round(input.amountKes * 100);

  if (!Number.isFinite(input.amountKes) || amountCents < 1000) {
    throw new Error("Minimum purchase amount is KES 10");
  }

  const payment = await simulatePayment({
    amountCents,
    paymentMethod: input.paymentMethod,
  });

  const db = getDb();

  return db.$transaction(async (tx) => {
    const meter = await tx.meter.findFirst({
      where: {
        id: input.meterId,
        OR: [
          { userId: input.userId },
          {
            shares: {
              some: {
                userId: input.userId,
                role: { in: ["PURCHASER", "MANAGER"] },
              },
            },
          },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!meter) {
      throw new Error("Meter not found");
    }

    if (!meter.user.isActive) {
      throw new Error("Customer account is inactive");
    }

    const units = calculateUnits(amountCents);
    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        meterId: meter.id,
        amountCents,
        units,
        status: payment.success ? "PENDING" : "FAILED",
        paymentMethod: input.paymentMethod,
        paymentReference: payment.reference,
        failureReason: payment.failureReason,
      },
    });

    if (!payment.success) {
      await writeAudit(tx, {
        actorUserId: input.userId,
        action: "purchase.payment_failed",
        entityType: "transaction",
        entityId: transaction.id,
        metadata: { reason: payment.failureReason },
      });

      return tx.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
        include: { meter: true, token: true },
      });
    }

    const tokenValue = generateSimulatedToken({
      transactionId: transaction.id,
      meterNumber: meter.meterNumber,
      units,
    });

    const token = await tx.token.create({
      data: {
        transactionId: transaction.id,
        tokenValue,
        units,
        status: "GENERATED",
      },
    });

    const meterResult = await applyTokenToSimulatedMeter(tx, {
      meterId: meter.id,
      tokenValue,
      units,
    });

    if (!meterResult.success) {
      await tx.token.update({
        where: { id: token.id },
        data: {
          status: "FAILED",
          failureReason: meterResult.error,
          transmittedAt: new Date(),
        },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          failureReason: meterResult.error,
        },
      });
      await writeAudit(tx, {
        actorUserId: input.userId,
        action: "purchase.meter_apply_failed",
        entityType: "transaction",
        entityId: transaction.id,
        metadata: { meterId: meter.id, reason: meterResult.error },
      });
    } else {
      await tx.meter.update({
        where: { id: meter.id },
        data: { balanceUnits: meterResult.newBalance },
      });
      await tx.token.update({
        where: { id: token.id },
        data: {
          status: "APPLIED",
          transmittedAt: new Date(),
          appliedAt: new Date(),
        },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "COMPLETED",
        },
      });
      await tx.notification.create({
        data: {
          userId: input.userId,
          transactionId: transaction.id,
          channel: "IN_APP",
          status: "SENT",
          subject: "Electricity purchase confirmed",
          message: `${units} kWh applied to meter ${meter.meterNumber}.`,
          sentAt: new Date(),
        },
      });
      await writeAudit(tx, {
        actorUserId: input.userId,
        action: "purchase.completed",
        entityType: "transaction",
        entityId: transaction.id,
        metadata: { meterId: meter.id, tokenId: token.id, units },
      });
    }

    return tx.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
      include: { meter: true, token: true },
    });
  });
}
