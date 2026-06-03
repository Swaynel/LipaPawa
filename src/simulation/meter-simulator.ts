import type { PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function applyTokenToSimulatedMeter(
  db: Db,
  input: {
    meterId: string;
    tokenValue: string;
    units: number;
  },
) {
  const meter = await db.meter.findUnique({
    where: { id: input.meterId },
  });

  if (!meter) {
    return { success: false, error: "Meter not found", newBalance: 0 };
  }

  if (meter.status !== "ACTIVE") {
    return {
      success: false,
      error: `Meter is ${meter.status.toLowerCase()}`,
      newBalance: meter.balanceUnits,
    };
  }

  const duplicateAppliedToken = await db.token.findFirst({
    where: {
      tokenValue: input.tokenValue,
      status: "APPLIED",
    },
  });

  if (duplicateAppliedToken) {
    return {
      success: false,
      error: "Token has already been applied",
      newBalance: meter.balanceUnits,
    };
  }

  return {
    success: true,
    newBalance: Number((meter.balanceUnits + input.units).toFixed(2)),
  };
}
