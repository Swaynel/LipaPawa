'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface TokenData {
  tokenValue: string; units: number; status: string; createdAt: string
  transaction: { amount: number; meter: { meterNumber: string; nickname: string | null } }
}

export default function TokenPage() {
  const { transactionId } = useParams()
  const router = useRouter()
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('accessToken')
    fetch(`/api/tokens/${transactionId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { setTokenData(d.token); setLoading(false) })
  }, [transactionId])

  const handleCopy = () => {
    if (!tokenData) return
    navigator.clipboard.writeText(tokenData.tokenValue.replace(/-/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
  if (!tokenData) return <div style={{ color: 'var(--danger)', fontSize: 13 }}>Token not found.</div>

  return (
    <div>
      <button onClick={() => router.back()} style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28,
        background: 'none', fontSize: 13, color: 'var(--text-muted)', padding: 0,
      }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>

      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>Token Details</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 32 }}>Use this to manually load units on your meter</p>

        {/* Token card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-lg)', padding: '36px', textAlign: 'center',
          marginBottom: 20, boxShadow: 'var(--shadow-accent)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-soft))' }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>Electricity Token</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600,
            letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 28, lineHeight: 1.3,
          }}>{tokenData.tokenValue}</div>
          <button onClick={handleCopy} style={{
            padding: '10px 28px',
            background: copied ? 'linear-gradient(135deg, var(--accent), var(--accent-soft))' : 'var(--bg-elevated)',
            color: copied ? '#080C14' : 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
            border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all 0.2s',
          }}>
            {copied ? '✓ Copied to clipboard' : 'Copy token'}
          </button>
        </div>

        {/* Details */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {[
            ['Meter', tokenData.transaction.meter.nickname || tokenData.transaction.meter.meterNumber],
            ['Meter Number', tokenData.transaction.meter.meterNumber],
            ['Units', `${tokenData.units} kWh`],
            ['Amount Paid', `KES ${tokenData.transaction.amount.toLocaleString()}`],
            ['Status', tokenData.status],
            ['Generated', new Date(tokenData.createdAt).toLocaleString()],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 20px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
