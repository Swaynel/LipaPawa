type MeterRecord = {
  id: string
  meterNumber: string
  nickname: string | null
  address: string
  balanceUnits: number
  status: string
  lowBalanceAlertEnabled?: boolean
  lowBalanceThreshold?: number
  lastLowBalanceAlertAt?: Date | null
  autoTopUpEnabled?: boolean
  autoTopUpThreshold?: number
  autoTopUpAmountCents?: number | null
  autoTopUpPaymentMethod?: string
  lastAutoTopUpAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

type TokenRecord = {
  id: string
  tokenValue: string
  units: number
  status: string
  createdAt: Date
  transmittedAt?: Date | null
  appliedAt?: Date | null
} | null

type TransactionRecord = {
  id: string
  amountCents: number
  units: number
  status: string
  paymentMethod: string
  paymentReference?: string | null
  failureReason?: string | null
  createdAt: Date
  updatedAt?: Date
  meter: {
    id?: string
    meterNumber: string
    nickname: string | null
    address?: string
    balanceUnits?: number
    status?: string
  }
  token?: TokenRecord
}

export function serializeMeter(meter: MeterRecord) {
  return {
    id: meter.id,
    meterNumber: meter.meterNumber,
    nickname: meter.nickname,
    address: meter.address,
    balance: meter.balanceUnits,
    status: meter.status,
    automation: {
      lowBalanceAlertEnabled: meter.lowBalanceAlertEnabled ?? false,
      lowBalanceThreshold: meter.lowBalanceThreshold ?? 5,
      lastLowBalanceAlertAt: meter.lastLowBalanceAlertAt?.toISOString() ?? null,
      autoTopUpEnabled: meter.autoTopUpEnabled ?? false,
      autoTopUpThreshold: meter.autoTopUpThreshold ?? 5,
      autoTopUpAmount:
        typeof meter.autoTopUpAmountCents === 'number'
          ? meter.autoTopUpAmountCents / 100
          : null,
      autoTopUpPaymentMethod: meter.autoTopUpPaymentMethod ?? 'MPESA',
      lastAutoTopUpAt: meter.lastAutoTopUpAt?.toISOString() ?? null,
    },
    createdAt: meter.createdAt?.toISOString(),
    updatedAt: meter.updatedAt?.toISOString(),
  }
}

export function serializeToken(token: Exclude<TokenRecord, null>) {
  return {
    id: token.id,
    tokenValue: token.tokenValue,
    units: token.units,
    status: token.status,
    createdAt: token.createdAt.toISOString(),
    transmittedAt: token.transmittedAt?.toISOString() ?? null,
    appliedAt: token.appliedAt?.toISOString() ?? null,
  }
}

export function serializeTransaction(transaction: TransactionRecord) {
  return {
    id: transaction.id,
    amount: transaction.amountCents / 100,
    units: transaction.units,
    status: transaction.status,
    paymentMethod: transaction.paymentMethod,
    paymentReference: transaction.paymentReference ?? null,
    failureReason: transaction.failureReason ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt?.toISOString(),
    meter: {
      id: transaction.meter.id,
      meterNumber: transaction.meter.meterNumber,
      nickname: transaction.meter.nickname,
      address: transaction.meter.address,
      balance:
        typeof transaction.meter.balanceUnits === 'number'
          ? transaction.meter.balanceUnits
          : undefined,
      status: transaction.meter.status,
    },
    token: transaction.token ? serializeToken(transaction.token) : null,
  }
}
