'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/client-auth'

interface Transaction {
  id: string; amount: number; units: number; status: string
  paymentMethod: string; createdAt: string
  meter: { meterNumber: string; nickname: string | null }
  token: { tokenValue: string; status: string } | null
}

const STATUS_STYLE: Record<string, { color: string; dim: string; border: string }> = {
  COMPLETED: { color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)' },
  FAILED:    { color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)' },
  PENDING:   { color: 'var(--warning)',  dim: 'var(--warning-dim)',  border: 'var(--warning-border)' },
  REVERSED:  { color: 'var(--text-muted)', dim: 'var(--bg-elevated)', border: 'var(--border)' },
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/transactions', {
      headers: authHeaders(),
      credentials: 'same-origin',
    })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load transactions')
        return data
      })
      .then(d => { setTransactions(d.transactions || []) })
      .catch(err => { setError(err instanceof Error ? err.message : 'Failed to load transactions') })
      .finally(() => { setLoading(false) })
  }, [])

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.status === filter)
  const total = filtered.reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Transactions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Your purchase history</p>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: 20, padding: '16px 20px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', marginBottom: 20, boxShadow: 'var(--shadow-sm)',
      }}>
        {[
          { label: 'Total', value: `${filtered.length} transactions` },
          { label: 'Spend', value: `KES ${total.toLocaleString()}` },
          { label: 'Completed', value: String(filtered.filter(t => t.status === 'COMPLETED').length) },
          { label: 'Pending', value: String(filtered.filter(t => t.status === 'PENDING').length) },
        ].map((s, i) => (
          <div key={s.label} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {i > 0 && <div style={{ width: 1, height: 28, background: 'var(--border)' }} />}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map(f => {
          const s = STATUS_STYLE[f] || { color: 'var(--text-muted)', dim: 'var(--bg-card)', border: 'var(--border)' }
          const active = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: active ? s.dim : 'var(--bg-card)',
              color: active ? s.color : 'var(--text-secondary)',
              border: `1px solid ${active ? s.border : 'var(--border)'}`,
            }}>{f}</button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : error ? (
        <div style={{
          background: 'var(--danger-dim)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          fontSize: 13,
          padding: '14px 18px',
        }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '40px', textAlign: 'center' }}>No transactions found.</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 90px 70px',
            padding: '10px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
            fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            <span>Meter</span><span>Date</span><span>Amount</span><span>Status</span><span style={{ textAlign: 'right' }}>Token</span>
          </div>
          {filtered.map((tx, i) => {
            const s = STATUS_STYLE[tx.status] || STATUS_STYLE.REVERSED
            return (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 90px 70px',
                alignItems: 'center', padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.meter.nickname || tx.meter.meterNumber}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{tx.meter.meterNumber}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>{tx.units} kWh</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>KES {tx.amount.toLocaleString()}</div>
                <div>
                  <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600, background: s.dim, color: s.color, border: `1px solid ${s.border}` }}>{tx.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {tx.token && (
                    <Link href={`/dashboard/tokens/${tx.id}`}>
                      <button style={{ padding: '5px 10px', background: 'var(--info-dim)', color: 'var(--info)', borderRadius: 8, fontSize: 11, fontWeight: 600, border: '1px solid var(--info-border)' }}>View</button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
