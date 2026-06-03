'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/client-auth'

interface Transaction {
  id: string
  amount: number
  units: number
  status: string
  paymentMethod: string
  createdAt: string
  meter: { meterNumber: string; nickname: string | null }
  token: { tokenValue: string; status: string } | null
}

function statusClass(status: string) {
  return `status-pill status-pill-wide status-${status.toLowerCase()}`
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/transactions', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false) })
  }, [])

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.status === filter)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <p className="page-copy">Purchases and automatic meter loading history</p>
      </div>

      <div className="filter-tabs">
        {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-button ${filter === f ? 'filter-button-active' : ''}`}
          >{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-text">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="muted-text">No transactions found.</div>
      ) : (
        <div className="list-card">
          {filtered.map(tx => (
            <div key={tx.id} className="transaction-row">
              <div>
                <div className="row-title">{tx.meter.nickname || tx.meter.meterNumber}</div>
                <div className="mono-muted">{tx.meter.meterNumber}</div>
              </div>
              <div className="transaction-amount">
                <div className="metric-value">KES {tx.amount.toLocaleString()}</div>
                <div className="row-meta-tight">{tx.units} kWh</div>
              </div>
              <div className="transaction-status">
                <span className={statusClass(tx.status)}>{tx.status}</span>
                <div className="row-meta">{new Date(tx.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="transaction-token-cell">
                {tx.token && (
                  <Link href={`/dashboard/tokens/${tx.id}`} className="button-info">
                    Details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
