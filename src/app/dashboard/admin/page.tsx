'use client'

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/client-auth'

type Tab = 'users' | 'meters' | 'transactions'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  isActive: boolean
  createdAt: string
  _count: { meters: number; transactions: number }
}

interface AdminTransaction {
  id: string
  amount: number
  units: number
  status: string
  createdAt: string
  user: { firstName: string; lastName: string; email: string }
  meter: { meterNumber: string }
}

function roleClass(role: string) {
  return `status-pill status-pill-wide ${role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'status-admin' : 'status-default'}`
}

function statusClass(status: string) {
  return `status-pill status-pill-wide status-${status.toLowerCase()}`
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users', { headers: authHeaders() }).then(r => r.json()),
      fetch('/api/admin/transactions', { headers: authHeaders() }).then(r => r.json()),
    ]).then(([u, t]) => {
      setUsers(u.users || [])
      setTransactions(t.transactions || [])
      setLoading(false)
    })
  }, [])

  const handleToggleUser = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ isActive: !isActive }),
    })
    setUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  const stats = [
    { label: 'Total users', value: users.length },
    { label: 'Active users', value: users.filter(u => u.isActive).length },
    { label: 'Total transactions', value: transactions.length },
    { label: 'Completed', value: transactions.filter(t => t.status === 'COMPLETED').length },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin panel</h1>
        <p className="page-copy">System overview and management</p>
      </div>

      <div className="admin-stats-grid">
        {stats.map(s => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-label">{s.label}</div>
            <div className="admin-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-tabs">
        {(['users', 'transactions'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-button ${tab === t ? 'tab-button-active' : ''}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-text">Loading...</div>
      ) : tab === 'users' ? (
        <div className="list-card">
          {users.map(user => (
            <div key={user.id} className="admin-user-row">
              <div>
                <div className="row-title">{user.firstName} {user.lastName}</div>
                <div className="row-meta">{user.email} · {user.phone}</div>
              </div>
              <div className="admin-meter-count">
                <div className="row-meta-tight">Meters</div>
                <div className="metric-value">{user._count.meters}</div>
              </div>
              <span className={roleClass(user.role)}>{user.role}</span>
              <button onClick={() => handleToggleUser(user.id, user.isActive)} className={`admin-status-cell ${user.isActive ? 'button-danger' : 'button-accent-outline'}`}>
                {user.isActive ? 'Suspend' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-card">
          {transactions.map(tx => (
            <div key={tx.id} className="admin-transaction-row">
              <div>
                <div className="row-title">{tx.user.firstName} {tx.user.lastName}</div>
                <div className="row-meta">
                  {tx.meter.meterNumber} · {new Date(tx.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="admin-amount-cell">
                <div className="metric-value">KES {tx.amount.toLocaleString()}</div>
                <div className="row-meta-tight">{tx.units} kWh</div>
              </div>
              <span className={statusClass(tx.status)}>{tx.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
