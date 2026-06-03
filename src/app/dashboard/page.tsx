'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/client-auth'

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
  paymentMethod: string
  createdAt: string
  meter: { meterNumber: string; nickname: string | null }
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card-accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-card-value ${accent ? 'stat-card-value-accent' : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function statusClass(status: string) {
  return `status-pill status-${status.toLowerCase()}`
}

function statusTextClass(status: string) {
  if (status === 'COMPLETED') return 'text-accent'
  if (status === 'FAILED') return 'text-danger'
  if (status === 'PENDING') return 'text-warning'
  return 'text-secondary'
}

export default function DashboardPage() {
  const [meters, setMeters] = useState<Meter[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/meters', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/transactions?limit=5', { headers: authHeaders() }).then(r => r.json()),
    ]).then(([m, t]) => {
      setMeters(m.meters || [])
      setTransactions(t.transactions || [])
      setLoading(false)
    })
  }, [])

  const totalBalance = meters.reduce((sum, m) => sum + m.balance, 0)

  if (loading) return (
    <div className="loading-text">Loading...</div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-copy">Your electricity at a glance</p>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Balance" value={`${totalBalance.toFixed(1)} kWh`} sub="Across all meters" accent />
        <StatCard label="Active Meters" value={String(meters.filter(m => m.status === 'ACTIVE').length)} sub={`${meters.length} registered`} />
        <StatCard label="Last Purchase" value={transactions[0] ? `KES ${transactions[0].amount}` : '—'} sub={transactions[0] ? new Date(transactions[0].createdAt).toLocaleDateString() : 'No transactions yet'} />
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Your meters</h2>
          <Link href="/dashboard/meters" className="accent-link">View all</Link>
        </div>

        {meters.length === 0 ? (
          <div className="empty-state">
            No meters registered.{' '}
            <Link href="/dashboard/meters" className="accent-link">Add one →</Link>
          </div>
        ) : (
          <div className="meter-card-grid">
            {meters.slice(0, 3).map(meter => (
              <div key={meter.id} className="meter-card">
                <div className="meter-card-header">
                  <div>
                    <div className="row-title">{meter.nickname || meter.meterNumber}</div>
                    <div className="mono-muted">{meter.meterNumber}</div>
                  </div>
                  <span className={statusClass(meter.status)}>{meter.status}</span>
                </div>
                <div className="meter-balance-large">
                  {meter.balance.toFixed(1)} <span className="meter-unit">kWh</span>
                </div>
                <div className="meter-address">{meter.address}</div>
                <Link href={`/dashboard/purchase?meterId=${meter.id}`}>
                  <button className="button-accent-outline">Buy units</button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="section-header">
          <h2 className="section-title">Recent transactions</h2>
          <Link href="/dashboard/transactions" className="accent-link">View all</Link>
        </div>

        {transactions.length === 0 ? (
          <div className="muted-text">No transactions yet.</div>
        ) : (
          <div className="list-card">
            {transactions.map(tx => (
              <div key={tx.id} className="list-row">
                <div>
                  <div className="row-title">{tx.meter.nickname || tx.meter.meterNumber}</div>
                  <div className="row-meta">
                    {tx.units} kWh · {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="row-side">
                  <div className="metric-value">KES {tx.amount}</div>
                  <div className={`row-meta ${statusTextClass(tx.status)}`}>{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
