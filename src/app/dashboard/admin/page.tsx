'use client'
import { useEffect, useState } from 'react'

type Tab = 'users' | 'transactions'

interface User {
  id: string; firstName: string; lastName: string; email: string; phone: string
  role: string; isActive: boolean; createdAt: string
  _count: { meters: number; transactions: number }
}

interface AdminTx {
  id: string; amount: number; units: number; status: string; createdAt: string
  user: { firstName: string; lastName: string; email: string }
  meter: { meterNumber: string }
}

const STATUS_STYLE: Record<string, { color: string; dim: string; border: string }> = {
  COMPLETED: { color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)' },
  FAILED:    { color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)' },
  PENDING:   { color: 'var(--warning)',  dim: 'var(--warning-dim)',  border: 'var(--warning-border)' },
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<AdminTx[]>([])
  const [loading, setLoading] = useState(true)

  const token = () => localStorage.getItem('accessToken')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([u, t]) => { setUsers(u.users || []); setTransactions(t.transactions || []); setLoading(false) })
  }, [])

  const toggleUser = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u))
  }

  const revenue = transactions.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0)

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Admin Panel</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>System management & analytics</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'Total Users', value: String(users.length), icon: '👥' },
          { label: 'Active Users', value: String(users.filter(u => u.isActive).length), icon: '✅' },
          { label: 'Transactions', value: String(transactions.length), icon: '📋' },
          { label: 'Revenue', value: `KES ${revenue.toLocaleString()}`, icon: '💰' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {(['users', 'transactions'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', fontSize: 13, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, borderRadius: 0,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : tab === 'users' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 60px 70px 90px',
            padding: '10px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
            fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            <span>User</span><span>Phone</span><span>Meters</span><span>Role</span><span style={{ textAlign: 'right' }}>Action</span>
          </div>
          {users.map((user, i) => (
            <div key={user.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 60px 70px 90px',
              alignItems: 'center', padding: '13px 20px',
              borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: user.isActive ? 1 : 0.5,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user.firstName} {user.lastName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{user.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.phone}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user._count.meters}</div>
              <div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                  background: user.role === 'ADMIN' ? 'var(--info-dim)' : 'var(--bg-elevated)',
                  color: user.role === 'ADMIN' ? 'var(--info)' : 'var(--text-muted)',
                  border: `1px solid ${user.role === 'ADMIN' ? 'var(--info-border)' : 'var(--border)'}`,
                }}>{user.role}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => toggleUser(user.id, user.isActive)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: user.isActive ? 'var(--danger-dim)' : 'var(--accent-dim)',
                  color: user.isActive ? 'var(--danger)' : 'var(--accent)',
                  border: `1px solid ${user.isActive ? 'var(--danger-border)' : 'var(--accent-border)'}`,
                }}>{user.isActive ? 'Suspend' : 'Activate'}</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 90px',
            padding: '10px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
            fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
          }}>
            <span>Customer</span><span>Meter</span><span>Amount</span><span>Status</span>
          </div>
          {transactions.map((tx, i) => {
            const s = STATUS_STYLE[tx.status] || { color: 'var(--text-muted)', dim: 'var(--bg-elevated)', border: 'var(--border)' }
            return (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 90px',
                alignItems: 'center', padding: '13px 20px',
                borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.user.firstName} {tx.user.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{tx.meter.meterNumber}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>KES {tx.amount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{tx.units} kWh</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600, background: s.dim, color: s.color, border: `1px solid ${s.border}` }}>{tx.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
