'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

import { PAYSTACK_PAYMENT_METHOD, type CheckoutPaymentMethod } from '@/lib/payment-methods'

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
  token?: { tokenValue: string }
}

const RATE = 20 // KES per kWh

const steps = ['Select Meter', 'Enter Amount', 'Confirm']

function formatPaymentMethod(method: string) {
  switch (method) {
    case 'MPESA':
      return 'M-Pesa'
    case 'CARD':
      return 'Card'
    case 'BANK':
      return 'Bank'
    case PAYSTACK_PAYMENT_METHOD:
      return 'Paystack'
    default:
      return method
  }
}

function PurchaseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [meters, setMeters] = useState<Meter[]>([])
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('MPESA')
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [error, setError] = useState('')

  const token = () => localStorage.getItem('accessToken')
  const units = amount ? (parseFloat(amount) / RATE).toFixed(2) : '0.00'
  const stepIndex = ['select', 'amount', 'confirm'].indexOf(step)
  const paymentStatus = searchParams.get('payment')
  const paymentReference = searchParams.get('reference')
  const paymentNotice =
    paymentStatus === 'cancelled'
      ? 'Paystack checkout was cancelled before payment was completed.'
      : paymentStatus === 'pending'
        ? 'Payment is still being confirmed. Your meter will update automatically once Paystack confirms it.'
      : paymentStatus === 'failed'
        ? 'Paystack payment could not be confirmed. Please try again.'
        : ''
  const paymentOptions: Array<{ value: CheckoutPaymentMethod; label: string }> = [
    { value: 'MPESA', label: 'M-Pesa' },
    { value: 'PAYSTACK', label: 'Paystack' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK', label: 'Bank' },
  ]

  useEffect(() => {
    fetch('/api/meters', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        const ms = d.meters || []
        setMeters(ms)
        const pre = searchParams.get('meterId')
        if (pre) {
          const m = ms.find((m: Meter) => m.id === pre)
          if (m) { setSelectedMeter(m); setStep('amount') }
        }
      })
  }, [searchParams])

  useEffect(() => {
    if (paymentStatus !== 'pending' || !paymentReference) return

    let active = true
    let attempts = 0

    const checkPaymentStatus = async () => {
      attempts += 1

      try {
        const response = await fetch(
          `/api/paystack/status?reference=${encodeURIComponent(paymentReference)}`,
          { headers: { Authorization: `Bearer ${token()}` }, credentials: 'same-origin' },
        )
        const data = await response.json()
        const refreshedTransaction = data.transaction

        if (
          active &&
          response.ok &&
          (refreshedTransaction?.status === 'COMPLETED' || refreshedTransaction?.token)
        ) {
          router.replace(`/dashboard/tokens/${refreshedTransaction.id}`)
        }
      } catch {
        // The webhook can still complete the payment if a status check fails.
      }
    }

    void checkPaymentStatus()
    const interval = window.setInterval(() => {
      if (attempts >= 15) {
        window.clearInterval(interval)
        return
      }

      void checkPaymentStatus()
    }, 2000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [paymentReference, paymentStatus, router])

  const handlePurchase = async () => {
    setStep('processing'); setError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ meterId: selectedMeter!.id, amount: parseFloat(amount), paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Purchase failed')
      if (data.authorizationUrl) {
        window.location.assign(data.authorizationUrl)
        return
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Buy Units</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Purchase electricity tokens for your meter</p>
      </div>

      {paymentNotice && (
        <div style={{
          background: paymentStatus === 'failed' ? 'var(--danger-dim)' : 'var(--warning-dim)',
          border: `1px solid ${paymentStatus === 'failed' ? 'var(--danger-border)' : 'var(--warning-border)'}`,
          color: paymentStatus === 'failed' ? 'var(--danger)' : 'var(--warning)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          fontSize: 13,
          marginBottom: 18,
        }}>
          {paymentNotice}
        </div>
      )}

      {/* Stepper */}
      {!['processing', 'success'].includes(step) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, maxWidth: 460 }}>
          {steps.map((label, i) => {
            const done = stepIndex > i
            const active = stepIndex === i
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: done ? 'var(--accent)' : active ? 'linear-gradient(135deg, var(--accent), var(--accent-soft))' : 'var(--bg-elevated)',
                    color: done || active ? '#080C14' : 'var(--text-muted)',
                    border: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: active ? 'var(--shadow-accent)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {done ? <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : done ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, margin: '0 10px', background: done ? 'var(--accent)' : 'var(--border)', borderRadius: 99, transition: 'background 0.3s' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Split layout for active steps */}
      {['select', 'amount', 'confirm'].includes(step) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', maxWidth: 860 }}>

          {/* Left: form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>

            {/* Step: Select */}
            {step === 'select' && (
              <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Choose a meter</div>
                {meters.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No meters. <Link href="/dashboard/meters" style={{ color: 'var(--accent)' }}>Add one first →</Link></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {meters.map(m => (
                      <div key={m.id} onClick={() => { setSelectedMeter(m); setStep('amount') }} style={{
                        padding: '14px 16px', border: `1px solid ${selectedMeter?.id === m.id ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: selectedMeter?.id === m.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all 0.15s',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.nickname || m.meterNumber}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.meterNumber}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{m.balance.toFixed(1)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>kWh left</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Amount */}
            {step === 'amount' && selectedMeter && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Purchase amount</div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (KES)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>KES</span>
                    <input
                      type="number" placeholder="0" min="50"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      style={{ paddingLeft: 46, fontSize: 20, fontWeight: 700 }}
                    />
                  </div>
                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {[100, 200, 500, 1000].map(a => (
                      <button key={a} onClick={() => setAmount(String(a))} style={{
                        padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                        background: amount === String(a) ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        color: amount === String(a) ? 'var(--accent)' : 'var(--text-secondary)',
                        border: `1px solid ${amount === String(a) ? 'var(--accent-border)' : 'var(--border)'}`,
                        fontSize: 12, fontWeight: 500,
                      }}>KES {a}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment method</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {paymentOptions.map(pm => (
                      <button key={pm.value} onClick={() => setPaymentMethod(pm.value)} style={{
                        flex: 1, padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        background: paymentMethod === pm.value ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        color: paymentMethod === pm.value ? 'var(--accent)' : 'var(--text-secondary)',
                        border: `1px solid ${paymentMethod === pm.value ? 'var(--accent-border)' : 'var(--border)'}`,
                        fontSize: 12, fontWeight: 600,
                      }}>{pm.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>Back</button>
                  <button onClick={() => setStep('confirm')} disabled={!amount || parseFloat(amount) < 50} style={{
                    flex: 2, padding: '11px', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
                    color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
                    opacity: !amount || parseFloat(amount) < 50 ? 0.4 : 1,
                  }}>Continue →</button>
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && selectedMeter && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Review & confirm</div>
                {error && (
                  <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</div>
                )}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 20 }}>
                  {[
                    ['Meter', selectedMeter.nickname || selectedMeter.meterNumber],
                    ['Meter Number', selectedMeter.meterNumber],
                    ['Amount', `KES ${parseFloat(amount).toLocaleString()}`],
                    ['Units', `${units} kWh`],
                    ['Rate', `KES ${RATE}/kWh`],
                    ['Payment', formatPaymentMethod(paymentMethod)],
                  ].map(([label, value], i, arr) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '11px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 13,
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('amount')} style={{ flex: 1, padding: '11px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>Back</button>
                  <button onClick={handlePurchase} style={{
                    flex: 2, padding: '11px',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
                    color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
                    boxShadow: 'var(--shadow-accent)',
                  }}>{paymentMethod === PAYSTACK_PAYMENT_METHOD ? 'Continue to Paystack →' : 'Confirm & Pay'}</button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order summary */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>Order Summary</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Meter</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedMeter?.nickname || selectedMeter?.meterNumber || '—'}</div>
              {selectedMeter && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{selectedMeter.meterNumber}</div>}
            </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 18 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                  <span style={{ fontWeight: 600 }}>{amount ? `KES ${parseFloat(amount).toLocaleString()}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Rate</span>
                  <span style={{ fontWeight: 600 }}>KES {RATE}/kWh</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment</span>
                  <span style={{ fontWeight: 600 }}>{formatPaymentMethod(paymentMethod) || '—'}</span>
                </div>
              </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 18 }} />

            {/* Units highlight */}
            <div style={{
              background: amount ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${amount ? 'var(--accent-border)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>You will receive</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: amount ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }}>{units}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>kWh</div>
            </div>

            {selectedMeter && amount && (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                New balance: <strong style={{ color: 'var(--accent)' }}>{(selectedMeter.balance + parseFloat(units)).toFixed(1)} kWh</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div style={{
          maxWidth: 400, margin: '0 auto', textAlign: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '56px 32px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2"/><path d="M21 12a9 9 0 00-9-9"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Processing Payment</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating token and applying to meter…</div>
        </div>
      )}

      {/* Success */}
      {step === 'success' && transaction && selectedMeter && (
        <div style={{
          maxWidth: 420, margin: '0 auto', textAlign: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-lg)', padding: '44px 32px',
          boxShadow: 'var(--shadow-accent)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 22px',
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 6 }}>Purchase Successful</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
            <strong style={{ color: 'var(--accent)' }}>{transaction.units} kWh</strong> applied to <strong>{selectedMeter.nickname || selectedMeter.meterNumber}</strong>
          </div>

          {transaction.token && (
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '18px', marginBottom: 24,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Token (manual fallback)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--accent)' }}>
                {transaction.token.tokenValue}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setStep('select'); setAmount(''); setSelectedMeter(null) }} style={{
              padding: '10px 20px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13,
            }}>Buy Again</button>
            <button onClick={() => router.push('/dashboard')} style={{
              padding: '10px 20px', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))', color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
            }}>Done</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function PurchasePage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading purchase flow...</div>}>
      <PurchaseContent />
    </Suspense>
  )
}
