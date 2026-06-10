CREATE TYPE "MeterShareRole" AS ENUM ('VIEWER', 'PURCHASER', 'MANAGER');
CREATE TYPE "PaymentMethodType" AS ENUM ('MPESA', 'CARD', 'BANK');
CREATE TYPE "ScheduledPurchaseFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE TABLE "MeterShare" (
  "id" TEXT NOT NULL,
  "meterId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MeterShareRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeterShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "PaymentMethodType" NOT NULL,
  "label" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'SIMULATED',
  "tokenReference" TEXT NOT NULL,
  "lastFour" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "meterId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "frequency" "ScheduledPurchaseFrequency" NOT NULL,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeterUsageSample" (
  "id" TEXT NOT NULL,
  "meterId" TEXT NOT NULL,
  "sampledAt" TIMESTAMP(3) NOT NULL,
  "unitsUsed" DOUBLE PRECISION NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'SIMULATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeterUsageSample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeterShare_meterId_userId_key" ON "MeterShare"("meterId", "userId");
CREATE INDEX "MeterShare_userId_idx" ON "MeterShare"("userId");
CREATE INDEX "MeterShare_meterId_idx" ON "MeterShare"("meterId");
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");
CREATE INDEX "PaymentMethod_type_idx" ON "PaymentMethod"("type");
CREATE INDEX "ScheduledPurchase_userId_idx" ON "ScheduledPurchase"("userId");
CREATE INDEX "ScheduledPurchase_meterId_idx" ON "ScheduledPurchase"("meterId");
CREATE INDEX "ScheduledPurchase_nextRunAt_idx" ON "ScheduledPurchase"("nextRunAt");
CREATE INDEX "ScheduledPurchase_isActive_idx" ON "ScheduledPurchase"("isActive");
CREATE INDEX "MeterUsageSample_meterId_idx" ON "MeterUsageSample"("meterId");
CREATE INDEX "MeterUsageSample_sampledAt_idx" ON "MeterUsageSample"("sampledAt");

ALTER TABLE "MeterShare" ADD CONSTRAINT "MeterShare_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeterShare" ADD CONSTRAINT "MeterShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPurchase" ADD CONSTRAINT "ScheduledPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPurchase" ADD CONSTRAINT "ScheduledPurchase_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeterUsageSample" ADD CONSTRAINT "MeterUsageSample_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
