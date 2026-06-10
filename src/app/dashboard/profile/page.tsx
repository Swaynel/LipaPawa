'use client'
import { useEffect, useState } from 'react'

interface User {
  id: string; firstName: string; lastName: string; email: string
  phone: string; role: string; isVerified: boolean; createdAt: string
}

type Tab = 'details' | 'security'
type Message = { type: 'success' | 'error'; text: string }

function Alert({ msg }: { msg: Message }) {
  return (
    <div style={{
      background: msg.type === 'success' ? 'var(--accent-dim)' : 'var(--danger-dim)',
      border: `1px solid ${msg.type === 'success' ? 'var(--accent-border)' : 'var(--danger-border)'}`,
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      fontSize: 12, color: msg.type === 'success' ? 'var(--accent)' : 'var(--danger)', marginBottom: 16,
    }}>{msg.text}</div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('details')
  const [detailsForm, setDetailsForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [detailsMsg, setDetailsMsg] = useState<Message | null>(null)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null)

  const token = () => localStorage.getItem('accessToken')

  useEffect(() => {
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => {
        setUser(d.user)
        setDetailsForm({ firstName: d.user.firstName, lastName: d.user.lastName, phone: d.user.phone })
        setLoading(false)
      })
  }, [])

  const handleDetailsSave = async (e: React.FormEvent) => {
    e.preventDefault(); setDetailsSaving(true); setDetailsMsg(null)
    try {
      const res = await fetch('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(detailsForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      setUser(data.user)
      window.dispatchEvent(new Event('profile:updated'))
      setDetailsMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) { setDetailsMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update' }) }
    finally { setDetailsSaving(false) }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault(); setPasswordMsg(null)
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
    if (passwordForm.newPassword.length < 8) return setPasswordMsg({ type: 'error', text: 'Minimum 8 characters.' })
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' })
    } catch (err) { setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' }) }
    finally { setPasswordSaving(false) }
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
  if (!user) return <div style={{ color: 'var(--danger)', fontSize: 13 }}>Failed to load profile.</div>

  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage your account</p>
      </div>

      {/* Profile card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20, padding: '24px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', marginBottom: 28, boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff',
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>{user.firstName} {user.lastName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
            <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600, background: 'var(--info-dim)', color: 'var(--info)', border: '1px solid var(--info-border)' }}>{user.role}</span>
            <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600, background: user.isVerified ? 'var(--accent-dim)' : 'var(--warning-dim)', color: user.isVerified ? 'var(--accent)' : 'var(--warning)', border: `1px solid ${user.isVerified ? 'var(--accent-border)' : 'var(--warning-border)'}` }}>{user.isVerified ? 'Verified' : 'Unverified'}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Member since</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>
            {new Date(user.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {(['details', 'security'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', fontSize: 13, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, borderRadius: 0,
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'details' && (
        <form onSubmit={handleDetailsSave} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {detailsMsg && <Alert msg={detailsMsg} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['First name', 'firstName', 'John'], ['Last name', 'lastName', 'Doe']].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</label>
                <input placeholder={ph} value={detailsForm[key as keyof typeof detailsForm]} onChange={e => setDetailsForm({ ...detailsForm, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Email</label>
            <input value={user.email} disabled style={{ opacity: 0.5 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Email cannot be changed.</div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Phone</label>
            <input placeholder="+254700000000" value={detailsForm.phone} onChange={e => setDetailsForm({ ...detailsForm, phone: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="submit" disabled={detailsSaving} style={{
              padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))', color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13, opacity: detailsSaving ? 0.6 : 1,
            }}>{detailsSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <div style={{ maxWidth: 480 }}>
          <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Change Password</h3>
            {passwordMsg && <Alert msg={passwordMsg} />}
            {[['Current password', 'currentPassword'], ['New password', 'newPassword'], ['Confirm new password', 'confirmPassword']].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</label>
                <input type="password" placeholder="••••••••" value={passwordForm[key as keyof typeof passwordForm]} onChange={e => setPasswordForm({ ...passwordForm, [key]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={passwordSaving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))', color: '#080C14', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13, opacity: passwordSaving ? 0.6 : 1 }}>{passwordSaving ? 'Updating…' : 'Update Password'}</button>
            </div>
          </form>

          <div style={{ padding: '22px 24px', background: 'var(--danger-dim)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)', marginBottom: 6 }}>Danger Zone</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Deactivating your account suspends all meters and prevents further purchases. Contact support to reverse.
            </div>
            <button type="button" onClick={() => confirm('Deactivate account?')} style={{ padding: '9px 18px', background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
              Deactivate Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
