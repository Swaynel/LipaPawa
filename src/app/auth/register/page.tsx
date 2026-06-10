'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      router.push('/auth/login')
    } catch (err) { setError(err instanceof Error ? err.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-accent)',
          }}>
            <svg width="16" height="16" fill="none" stroke="#080C14" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>PowerPay</span>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '36px', boxShadow: 'var(--shadow-md)',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>Create account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>Start managing your prepaid electricity</p>

          {error && (
            <div style={{
              background: 'var(--danger-dim)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              fontSize: 12, color: 'var(--danger)', marginBottom: 18,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'firstName', label: 'First name', placeholder: 'John' },
                { key: 'lastName', label: 'Last name', placeholder: 'Doe' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{f.label}</label>
                  <input placeholder={f.placeholder} value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
                </div>
              ))}
            </div>
            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@email.com' },
              { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+254700000000' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '13px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
              color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14,
              opacity: loading ? 0.7 : 1, boxShadow: 'var(--shadow-accent)',
            }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
