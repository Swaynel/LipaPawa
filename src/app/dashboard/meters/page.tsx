'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { authHeaders } from '@/lib/client-auth'

interface Meter {
  id: string
  meterNumber: string
  nickname: string | null
  address: string
  balance: number
  status: string
}

function statusClass(status: string) {
  return `status-pill status-${status.toLowerCase()}`
}

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ meterNumber: '', nickname: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadMeters = useCallback(() => {
    fetch('/api/meters', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setMeters(d.meters || []); setLoading(false) })
  }, [])

  useEffect(() => { loadMeters() }, [loadMeters])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/meters', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add meter')
      setShowForm(false)
      setForm({ meterNumber: '', nickname: '', address: '' })
      loadMeters()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meter')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this meter?')) return
    await fetch(`/api/meters/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    loadMeters()
  }

  return (
    <div>
      <div className="page-header-with-action">
        <div>
          <h1 className="page-title">Meters</h1>
          <p className="page-copy">Manage your registered meters</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="button-primary">
          + Add meter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="form-card form-stack">
          <h3 className="form-section-title">Register new meter</h3>
          {error && <div className="form-error">{error}</div>}
          <div className="meter-form-grid">
            <div>
              <label className="field-label">Meter number *</label>
              <input
                placeholder="e.g. 01234567890"
                value={form.meterNumber}
                onChange={e => setForm({ ...form, meterNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label">Nickname (optional)</label>
              <input
                placeholder="e.g. Home, Office"
                value={form.nickname}
                onChange={e => setForm({ ...form, nickname: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Address *</label>
            <input
              placeholder="e.g. 12 Westlands Road, Nairobi"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowForm(false)} className="button-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="button-primary">
              {submitting ? 'Adding...' : 'Add meter'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading-text">Loading meters...</div>
      ) : meters.length === 0 ? (
        <div className="empty-state empty-state-large">No meters registered yet. Add your first meter above.</div>
      ) : (
        <div className="meter-list">
          {meters.map(meter => (
            <div key={meter.id} className="meter-row">
              <div className="meter-row-info">
                <div>
                  <div className="row-title-lg">{meter.nickname || meter.meterNumber}</div>
                  <div className="mono-muted">{meter.meterNumber}</div>
                  <div className="row-meta">{meter.address}</div>
                </div>
              </div>
              <div className="meter-row-actions">
                <div className="meter-balance">
                  <div className="metric-value-lg">{meter.balance.toFixed(1)}</div>
                  <div className="row-meta">kWh remaining</div>
                </div>
                <span className={statusClass(meter.status)}>{meter.status}</span>
                <button onClick={() => handleDelete(meter.id)} className="button-danger">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
