'use client'

import { ReactNode, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { authHeaders } from '@/lib/client-auth'

type Step = 'select' | 'amount' | 'confirm' | 'processing' | 'success'

interface Meter {
  id: string
  meterNumber: string
  nickname: string | null
  address: string
  balance: number
}

interface Transaction {
  id: string
  units: number
  amount: number
  status: string
  failureReason?: string | null
  token?: { tokenValue: string; status: string } | null
}

const RATE_PER_KWH = 20

function Label({ children }: { children: ReactNode }) {
  return <div className="purchase-label">{children}</div>
}

function Card({ children, variant = '' }: { children: ReactNode; variant?: string }) {
  return <div className={`purchase-card ${variant}`}>{children}</div>
}

function AutomationTimeline({ tokenStatus }: { tokenStatus?: string }) {
  const steps = [
    'Payment confirmed',
    'Electricity token generated',
    'Token sent to meter',
    'Units applied automatically',
  ]

  return (
    <div className="automation-panel">
      <div className="automation-title">Automation completed</div>
      <div className="automation-list">
        {steps.map((item, index) => (
          <div key={item} className="automation-step">
            <span className="automation-marker">✓</span>
            <span>{item}</span>
            {index === 1 && tokenStatus && <span className="automation-meta">{tokenStatus}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function PurchaseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [meters, setMeters] = useState<Meter[]>([])
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('MPESA')
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [error, setError] = useState('')

  const units = amount ? (parseFloat(amount) / RATE_PER_KWH).toFixed(2) : '0.00'

  useEffect(() => {
    fetch('/api/meters', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        const ms = d.meters || []
        setMeters(ms)
        const preselected = searchParams.get('meterId')
        if (preselected) {
          const m = ms.find((m: Meter) => m.id === preselected)
          if (m) { setSelectedMeter(m); setStep('amount') }
        }
      })
  }, [searchParams])

  const handlePurchase = async () => {
    setStep('processing')
    setError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ meterId: selectedMeter!.id, amount: parseFloat(amount), paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Purchase failed')
      if (data.transaction?.status === 'FAILED') {
        throw new Error(data.transaction.failureReason || 'Automatic loading failed')
      }
      setTransaction(data.transaction)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
      setStep('confirm')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Buy units</h1>
        <p className="page-copy">Purchase electricity for your meter</p>
      </div>

      <div className="step-indicator">
        {(['select', 'amount', 'confirm'] as Step[]).map((s, i) => {
          const complete = ['select', 'amount', 'confirm', 'processing', 'success'].indexOf(step) > i
          const active = step === s

          return (
            <div key={s} className="step-item">
              <div className={`step-dot ${active ? 'step-dot-active' : ''} ${complete ? 'step-dot-complete' : ''}`}>{i + 1}</div>
              <span className={`step-label ${active ? 'step-label-active' : ''}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < 2 && <div className="step-line" />}
            </div>
          )
        })}
      </div>

      {step === 'select' && (
        <Card>
          <Label>Select a meter</Label>
          {meters.length === 0 ? (
            <div className="muted-text">No meters registered. Add a meter first.</div>
          ) : (
            <div className="purchase-option-list">
              {meters.map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => { setSelectedMeter(m); setStep('amount') }}
                  className={`purchase-meter-option ${selectedMeter?.id === m.id ? 'purchase-meter-option-selected' : ''}`}
                >
                  <span>
                    <span className="row-title">{m.nickname || m.meterNumber}</span>
                    <span className="mono-muted">{m.meterNumber}</span>
                  </span>
                  <span className="purchase-meter-balance">{m.balance.toFixed(1)} kWh</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 'amount' && selectedMeter && (
        <Card>
          <Label>Enter amount</Label>
          <div className="purchase-meter-summary">
            <span className="summary-label">Meter</span>
            <span className="summary-value">{selectedMeter.nickname || selectedMeter.meterNumber}</span>
          </div>

          <div className="field-block">
            <label className="field-label">Amount (KES)</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={amount}
              min="50"
              onChange={e => setAmount(e.target.value)}
            />
            {amount && (
              <div className="field-helper">
                ≈ {units} kWh at KES {RATE_PER_KWH}/kWh
              </div>
            )}
          </div>

          <div className="field-block-spaced">
            <label className="field-label">Payment method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="MPESA">M-Pesa</option>
              <option value="CARD">Bank Card</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>

          <div className="button-row">
            <button onClick={() => setStep('select')} className="button-secondary">Back</button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!amount || parseFloat(amount) < 50}
              className="button-primary"
            >Continue</button>
          </div>
        </Card>
      )}

      {step === 'confirm' && selectedMeter && (
        <Card>
          <Label>Confirm purchase</Label>
          {error && <div className="form-error">{error}</div>}
          {[
            ['Meter', selectedMeter.nickname || selectedMeter.meterNumber],
            ['Meter number', selectedMeter.meterNumber],
            ['Amount', `KES ${parseFloat(amount).toLocaleString()}`],
            ['Units', `${units} kWh`],
            ['Payment', paymentMethod],
          ].map(([label, value]) => (
            <div key={label} className="purchase-summary-row">
              <span className="summary-label">{label}</span>
              <span className="summary-value">{value}</span>
            </div>
          ))}

          <div className="button-row purchase-actions">
            <button onClick={() => setStep('amount')} className="button-secondary">Back</button>
            <button onClick={handlePurchase} className="button-primary">Pay and auto-load</button>
          </div>
        </Card>
      )}

      {step === 'processing' && (
        <Card variant="processing-card">
          <div className="processing-icon">⟳</div>
          <div className="processing-title">Auto-loading your meter...</div>
          <div className="processing-copy">Confirming payment, generating the token, and sending it to the meter</div>
        </Card>
      )}

      {step === 'success' && transaction && selectedMeter && (
        <Card variant="success-card">
          <div className="success-icon">✓</div>
          <div className="success-title">Units loaded automatically</div>
          <div className="success-copy">
            {transaction.units} kWh was applied to {selectedMeter.nickname || selectedMeter.meterNumber}.
          </div>

          <AutomationTimeline tokenStatus={transaction.token?.status} />

          <div className="fallback-panel">
            <div>
              <div className="fallback-title">Fallback token saved</div>
              <div className="fallback-copy">Only use it if the meter does not reflect the new units.</div>
            </div>
            {transaction.token && (
              <Link href={`/dashboard/tokens/${transaction.id}`} className="button-info fallback-link">
                View fallback
              </Link>
            )}
          </div>

          <div className="button-row button-row-spaced">
            <button onClick={() => { setStep('select'); setAmount(''); setSelectedMeter(null) }} className="button-secondary">Buy again</button>
            <button onClick={() => router.push('/dashboard')} className="button-primary">Back to dashboard</button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function PurchasePage() {
  return (
    <Suspense fallback={<div className="loading-text">Loading purchase flow...</div>}>
      <PurchaseContent />
    </Suspense>
  )
}
