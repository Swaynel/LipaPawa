'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Meter {
  id: string
  meterNumber: string
  nickname: string | null
  address: string
  balance: number
  status: string
}

interface Transaction {
  id: string
  amount: number
  units: number
  status: string
  createdAt: string
  meter: { meterNumber: string; nickname: string | null }
}

/* ── helpers ───────────────────────────────────────────── */
function getMeterState(balance: number, status: string): {
  label: string; color: string; dim: string; border: string; urgent: boolean
} {
  if (status !== 'ACTIVE') return { label: 'INACTIVE', color: 'var(--text-muted)', dim: 'var(--bg-elevated)', border: 'var(--border)', urgent: false }
  if (balance === 0)       return { label: 'DEPLETED', color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)',   urgent: true }
  if (balance < 5)         return { label: 'CRITICAL', color: 'var(--depleted)', dim: 'var(--depleted-dim)', border: 'var(--depleted-border)', urgent: true }
  if (balance < 20)        return { label: 'LOW',      color: 'var(--warning)',  dim: 'var(--warning-dim)',  border: 'var(--warning-border)',  urgent: false }
  return                          { label: 'HEALTHY',  color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)',   urgent: false }
}

function BalanceBar({ balance, max = 100 }: { balance: number; max?: number }) {
  const pct = Math.min((balance / max) * 100, 100)
  const state = getMeterState(balance, 'ACTIVE')
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Balance</span>
        <span style={{ fontSize: 11, color: state.color, fontWeight: 600 }}>{balance.toFixed(1)} kWh</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: pct === 0 ? 'var(--danger)' : pct < 5 ? 'var(--depleted)' : pct < 20 ? 'var(--warning)' : 'var(--accent)',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function statusColor(s: string) {
  if (s === 'COMPLETED') return 'var(--accent)'
  if (s === 'FAILED') return 'var(--danger)'
  if (s === 'PENDING') return 'var(--warning)'
  return 'var(--text-muted)'
}

/* ── page ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const [meters, setMeters] = useState<Meter[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('accessToken')
    const h = { Authorization: `Bearer ${t}` }
    Promise.all([
      fetch('/api/meters', { headers: h }).then(r => r.json()),
      fetch('/api/transactions?limit=5', { headers: h }).then(r => r.json()),
    ]).then(([m, tx]) => {
      setMeters(m.meters || [])
      setTransactions(tx.transactions || [])
      setLoading(false)
    })
  }, [])

  const totalBalance = meters.reduce((s, m) => s + m.balance, 0)
  const urgentMeters = meters.filter(m => getMeterState(m.balance, m.status).urgent)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
      Loading dashboard...
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/purchase">
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 100%)',
            color: '#080C14',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700, fontSize: 13,
            boxShadow: 'var(--shadow-accent)',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Buy Units
          </button>
        </Link>
      </div>

      {/* Urgent alert */}
      {urgentMeters.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          background: 'var(--danger-dim)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
        }}>
          <svg width="18" height="18" fill="none" stroke="var(--danger)" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>
              {urgentMeters.length} meter{urgentMeters.length > 1 ? 's' : ''} need{urgentMeters.length === 1 ? 's' : ''} immediate attention —
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>
              {urgentMeters.map(m => m.nickname || m.meterNumber).join(', ')}
            </span>
          </div>
          <Link href="/dashboard/purchase">
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, borderBottom: '1px solid var(--danger)' }}>Top up now →</span>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          {
            label: 'Total Balance',
            value: `${totalBalance.toFixed(1)}`,
            unit: 'kWh',
            sub: `Across ${meters.length} meter${meters.length !== 1 ? 's' : ''}`,
            accent: true,
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
          },
          {
            label: 'Active Meters',
            value: String(meters.filter(m => m.status === 'ACTIVE').length),
            unit: '',
            sub: `${urgentMeters.length} need attention`,
            accent: false,
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
          },
          {
            label: 'Last Purchase',
            value: transactions[0] ? `${transactions[0].amount.toLocaleString()}` : '—',
            unit: transactions[0] ? 'KES' : '',
            sub: transactions[0] ? new Date(transactions[0].createdAt).toLocaleDateString() : 'No purchases yet',
            accent: false,
            icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
          },
        ].map(stat => (
          <div key={stat.label} className="dashboard-stat-card" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 22px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</span>
              <div style={{ color: stat.accent ? 'var(--accent)' : 'var(--text-muted)' }}>{stat.icon}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 4 }}>
              {stat.unit === 'KES' && <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>KES</span>}
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: stat.accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</span>
              {stat.unit && stat.unit !== 'KES' && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.unit}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Meters */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Your Meters</h2>
          <Link href="/dashboard/meters" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>Manage all →</Link>
        </div>

        {meters.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)', padding: '40px',
            textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
          }}>
            No meters yet.{' '}
            <Link href="/dashboard/meters" style={{ color: 'var(--accent)', fontWeight: 500 }}>Register one →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {meters.slice(0, 3).map(meter => {
              const state = getMeterState(meter.balance, meter.status)
              return (
                <div key={meter.id} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${state.urgent ? state.border : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: state.urgent ? `0 0 0 1px ${state.border}, var(--shadow-sm)` : 'var(--shadow-sm)',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{meter.nickname || 'Meter'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{meter.meterNumber}</div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 600, letterSpacing: '0.05em',
                      background: state.dim, color: state.color, border: `1px solid ${state.border}`,
                    }}>{state.label}</span>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{meter.address}</div>

                  <BalanceBar balance={meter.balance} />

                  {state.urgent && (
                    <div style={{ marginTop: 10, fontSize: 11, color: state.color, fontWeight: 500 }}>
                      {meter.balance === 0 ? '⚠ Meter depleted — top up to restore power' : '⚠ Balance critically low'}
                    </div>
                  )}

                  <Link href={`/dashboard/purchase?meterId=${meter.id}`}>
                    <button style={{
                      marginTop: 14, width: '100%', padding: '9px',
                      background: state.urgent ? state.dim : 'var(--accent-dim)',
                      color: state.urgent ? state.color : 'var(--accent)',
                      border: `1px solid ${state.urgent ? state.border : 'var(--accent-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12, fontWeight: 600,
                    }}>{state.urgent ? 'Top up now' : 'Buy units'}</button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Recent Transactions</h2>
          <Link href="/dashboard/transactions" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>View all →</Link>
        </div>

        {transactions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No transactions yet.</div>
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            {transactions.map((tx, i) => (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: tx.status === 'COMPLETED' ? 'var(--accent-dim)' : tx.status === 'FAILED' ? 'var(--danger-dim)' : 'var(--warning-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: statusColor(tx.status), flexShrink: 0,
                  }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.meter.nickname || tx.meter.meterNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{tx.units} kWh · {new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>KES {tx.amount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: statusColor(tx.status), marginTop: 1, fontWeight: 500 }}>{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
