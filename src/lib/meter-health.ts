export type MeterHealthInput = {
  balance: number
  status: string
  lowBalanceThreshold?: number
}

export type MeterHealth = {
  label: string
  key: string
  statusClass: string
  cardClass: string
  progressClass: string
  progressPercent: number
  prompt: string
}

export function getMeterHealth(meter: MeterHealthInput): MeterHealth {
  const normalizedStatus = meter.status.toUpperCase()
  const threshold = meter.lowBalanceThreshold ?? 5
  const progressPercent = Math.max(0, Math.min(100, (meter.balance / 100) * 100))

  if (normalizedStatus === 'SUSPENDED' || normalizedStatus === 'INACTIVE') {
    const key = normalizedStatus.toLowerCase()
    return {
      label: normalizedStatus,
      key,
      statusClass: `status-pill status-${key}`,
      cardClass: `meter-health-${key}`,
      progressClass: 'balance-fill-danger',
      progressPercent,
      prompt: normalizedStatus === 'SUSPENDED'
        ? 'Meter suspended. Contact support.'
        : 'Meter inactive.',
    }
  }

  if (meter.balance <= 0) {
    return {
      label: 'DEPLETED',
      key: 'depleted',
      statusClass: 'status-pill status-depleted',
      cardClass: 'meter-health-depleted',
      progressClass: 'balance-fill-danger',
      progressPercent: 0,
      prompt: 'Recharge now to restore power.',
    }
  }

  if (meter.balance <= threshold) {
    return {
      label: 'LOW',
      key: 'low',
      statusClass: 'status-pill status-low',
      cardClass: 'meter-health-low',
      progressClass: 'balance-fill-warning',
      progressPercent,
      prompt: 'Balance is low. Top up soon.',
    }
  }

  return {
    label: normalizedStatus,
    key: normalizedStatus.toLowerCase(),
    statusClass: `status-pill status-${normalizedStatus.toLowerCase()}`,
    cardClass: 'meter-health-good',
    progressClass: 'balance-fill-accent',
    progressPercent,
    prompt: 'Balance is healthy.',
  }
}

export function meterTrendBars(balance: number, count = 7) {
  const seed = Math.max(1, Math.round(balance * 10))

  return Array.from({ length: count }, (_, index) => {
    const wave = ((seed + index * 17) % 31) + 16
    const taper = Math.max(0, count - index - 1) * 3
    return Math.max(12, Math.min(58, wave + taper))
  })
}
