'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Meter {
  id: string
  meterNumber: string
  nickname: string | null
  address: string
  balance: number
  status: string
}

function getMeterState(balance: number, status: string) {
  if (status !== 'ACTIVE') return { label: 'INACTIVE', color: 'var(--text-muted)', dim: 'var(--bg-elevated)', border: 'var(--border)', urgent: false }
  if (balance === 0)       return { label: 'DEPLETED', color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)',   urgent: true }
  if (balance < 5)         return { label: 'CRITICAL', color: 'var(--depleted)', dim: 'var(--depleted-dim)', border: 'var(--depleted-border)', urgent: true }
  if (balance < 20)        return { label: 'LOW',      color: 'var(--warning)',  dim: 'var(--warning-dim)',  border: 'var(--warning-border)',  urgent: false }
  return                          { label: 'HEALTHY',  color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)',   urgent: false }
}

function BalanceBar({ balance, max = 100 }: { balance: number; max?: number }) {
  const pct = Math.min((balance / max) * 100, 100)
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden', width: 80 }}>
      <div style={{
        height: '100%', borderRadius: 99, width: `${pct}%`,
        background: pct === 0 ? 'var(--danger)' : pct < 5 ? 'var(--depleted)' : pct < 20 ? 'var(--warning)' : 'var(--accent)',
      }} />
    </div>
  )
}

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ meterNumber: '', nickname: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const token = () => localStorage.getItem('accessToken')

  const loadMeters = useCallback(() => {
    fetch('/api/meters', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { setMeters(d.meters || []); setLoading(false) })
  }, [])

  useEffect(() => { loadMeters() }, [loadMeters])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add meter')
      setShowForm(false)
      setForm({ meterNumber: '', nickname: '', address: '' })
      loadMeters()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add meter') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this meter?')) return
    await fetch(`/api/meters/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    loadMeters()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Meters</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{meters.length} registered</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 16px',
          background: showForm ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
          color: showForm ? 'var(--text-secondary)' : '#080C14',
          borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
          boxShadow: showForm ? 'none' : 'var(--shadow-accent)',
        }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {showForm ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M12 5v14M5 12h14"/>}
          </svg>
          {showForm ? 'Cancel' : 'Add Meter'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={{
          background: 'var(--bg-card)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: 24,
          boxShadow: 'var(--shadow-accent)',
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Register New Meter</h3>
          {error && (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>{error}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meter Number *</label>
              <input placeholder="e.g. 01234567890" value={form.meterNumber} onChange={e => setForm({ ...form, meterNumber: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nickname</label>
              <input placeholder="e.g. Home, Office" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Address *</label>
            <input placeholder="e.g. 12 Westlands Road, Nairobi" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={submitting} style={{
              padding: '10px 22px', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
              color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13,
              opacity: submitting ? 0.6 : 1,
            }}>{submitting ? 'Registering...' : 'Register Meter'}</button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : meters.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)', padding: '60px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 13,
        }}>No meters yet. Register your first meter above.</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 100px 90px',
            padding: '10px 20px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
          }}>
            <span>Meter</span>
            <span>Address</span>
            <span>Balance</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {/* Rows */}
          {meters.map((meter, i) => {
            const state = getMeterState(meter.balance, meter.status)
            return (
              <div key={meter.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 100px 90px',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: i < meters.length - 1 ? '1px solid var(--border)' : 'none',
                background: state.urgent ? `${state.dim}44` : 'transparent',
                transition: 'background 0.15s',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{meter.nickname || meter.meterNumber}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{meter.meterNumber}</div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingRight: 16 }}>{meter.address}</div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: state.color }}>{meter.balance.toFixed(1)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>kWh</span></div>
                  <BalanceBar balance={meter.balance} />
                </div>

                <div>
                  <span style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600,
                    background: state.dim, color: state.color, border: `1px solid ${state.border}`,
                  }}>{state.label}</span>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Link href={`/dashboard/purchase?meterId=${meter.id}`}>
                    <button title="Buy units" style={{
                      width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
                    }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </Link>
                  <button title="Remove meter" onClick={() => handleDelete(meter.id)} style={{
                    width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger-border)',
                    opacity: 0.6, transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
