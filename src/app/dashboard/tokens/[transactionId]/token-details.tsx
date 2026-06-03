'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { authHeaders } from '@/lib/client-auth'

interface TokenData {
  tokenValue: string
  units: number
  status: string
  createdAt: string
  transmittedAt: string | null
  appliedAt: string | null
  transaction: {
    amount: number
    status: string
    paymentReference: string | null
    meter: { meterNumber: string; nickname: string | null }
  }
}

type TokenDetailsProps = {
  transactionId: string
  variant?: 'page' | 'modal'
}

function TokenDetailsContent({
  tokenData,
  copied,
  onCopy,
  titleId,
}: {
  tokenData: TokenData
  copied: boolean
  onCopy: () => void
  titleId: string
}) {
  const automationSteps = [
    {
      label: 'Payment',
      value: tokenData.transaction.status === 'COMPLETED' ? 'Confirmed' : tokenData.transaction.status,
      complete: tokenData.transaction.status === 'COMPLETED',
    },
    {
      label: 'Token generation',
      value: ['APPLIED', 'TRANSMITTED', 'GENERATED'].includes(tokenData.status) ? 'Generated' : tokenData.status,
      complete: ['APPLIED', 'TRANSMITTED', 'GENERATED'].includes(tokenData.status),
    },
    {
      label: 'Meter transmission',
      value: tokenData.transmittedAt ? 'Sent' : 'Pending',
      complete: Boolean(tokenData.transmittedAt),
    },
    {
      label: 'Meter application',
      value: tokenData.appliedAt ? 'Applied automatically' : 'Waiting for meter',
      complete: Boolean(tokenData.appliedAt),
    },
  ]

  return (
    <div className="token-page-inner">
      <h1 id={titleId} className="page-title token-title">Fallback token</h1>
      <p className="page-copy token-copy">This purchase is designed to load automatically. Use the token only if the meter did not apply the units.</p>

      <div className="automation-panel token-automation-panel">
        <div className="automation-title">Automatic loading status</div>
        <div className="automation-list">
          {automationSteps.map(step => (
            <div key={step.label} className="automation-step">
              <span className={`automation-marker ${step.complete ? '' : 'automation-marker-pending'}`}>
                {step.complete ? '✓' : '•'}
              </span>
              <span>{step.label}</span>
              <span className="automation-meta">{step.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="token-card">
        <div className="token-kicker">Manual fallback token</div>
        <div className="token-code">{tokenData.tokenValue}</div>
        <button type="button" onClick={onCopy} className={`token-copy-button ${copied ? 'token-copy-button-copied' : ''}`}>
          {copied ? '✓ Copied' : 'Copy token'}
        </button>
      </div>

      <div className="token-details">
        {[
          ['Meter', tokenData.transaction.meter.nickname || tokenData.transaction.meter.meterNumber],
          ['Meter number', tokenData.transaction.meter.meterNumber],
          ['Units', `${tokenData.units} kWh`],
          ['Amount paid', `KES ${tokenData.transaction.amount.toLocaleString()}`],
          ['Transaction status', tokenData.transaction.status],
          ['Token status', tokenData.status],
          ['Date', new Date(tokenData.createdAt).toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="detail-row">
            <span className="detail-label">{label}</span>
            <span className="detail-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TokenDetails({ transactionId, variant = 'page' }: TokenDetailsProps) {
  const router = useRouter()
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const isModal = variant === 'modal'
  const titleId = isModal ? 'token-modal-title' : 'token-page-title'

  useEffect(() => {
    let active = true

    fetch(`/api/tokens/${transactionId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (!active) return
        setTokenData(d.token)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setTokenData(null)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [transactionId])

  useEffect(() => {
    if (!isModal) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.back()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, router])

  const handleCopy = () => {
    if (!tokenData) return
    navigator.clipboard.writeText(tokenData.tokenValue.replace(/-/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const content = loading ? (
    <div className="loading-text">Loading...</div>
  ) : tokenData ? (
    <TokenDetailsContent
      tokenData={tokenData}
      copied={copied}
      onCopy={handleCopy}
      titleId={titleId}
    />
  ) : (
    <div className="danger-text">Token not found.</div>
  )

  if (isModal) {
    return (
      <div className="modal-backdrop">
        <button
          type="button"
          className="modal-scrim"
          aria-label="Close fallback token details"
          onClick={() => router.back()}
        />
        <section className="modal-dialog token-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="modal-close-button" aria-label="Close fallback token details" onClick={() => router.back()}>
            ×
          </button>
          {content}
        </section>
      </div>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => router.back()} className="back-button">← Back</button>
      {content}
    </div>
  )
}
