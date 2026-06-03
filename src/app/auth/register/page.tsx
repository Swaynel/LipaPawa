'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      router.push('/auth/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        required
      />
    </div>
  )

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        <div className="auth-header auth-header-compact">
          <div className="auth-kicker">PowerPay</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-copy">Start managing your prepaid electricity</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-name-grid">
            {field('firstName', 'First name', 'text', 'John')}
            {field('lastName', 'Last name', 'text', 'Doe')}
          </div>
          {field('email', 'Email', 'email', 'you@email.com')}
          {field('phone', 'Phone', 'tel', '+254700000000')}
          {field('password', 'Password', 'password', '••••••••')}

          <button type="submit" disabled={loading} className="button-primary">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footnote">
          Already have an account?{' '}
          <Link href="/auth/login" className="accent-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
