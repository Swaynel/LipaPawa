'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/meters', label: 'Meters', icon: '⬡' },
  { href: '/dashboard/purchase', label: 'Buy Units', icon: '⊕' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: '≡' },
  { href: '/dashboard/profile', label: 'Profile', icon: '◯' },
]

export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [checkedSession, setCheckedSession] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (!response.ok || !data.user) {
          window.localStorage.removeItem('accessToken')
          router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
          return
        }

        if (active) {
          setUserEmail(data.user.email)
          setCheckedSession(true)
        }
      } catch {
        window.localStorage.removeItem('accessToken')
        router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [pathname, router])

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.localStorage.removeItem('accessToken')
      router.push('/auth/login')
      router.refresh()
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-kicker">Volts</div>
          <div className="dashboard-brand-title">PowerPay</div>
        </div>

        <nav className="dashboard-nav">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-nav-item ${active ? 'dashboard-nav-item-active' : ''}`}
              >
                <span className="dashboard-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="dashboard-user-panel">
          <div className="dashboard-user-card">
            <div className="dashboard-user-label">Logged in as</div>
            <div className="dashboard-user-email">{userEmail || 'Checking session...'}</div>
          </div>
          <button type="button" onClick={handleSignOut} className="dashboard-signout">
            Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        {checkedSession ? children : <div className="loading-text">Checking session...</div>}
      </main>
      {checkedSession ? modal : null}
    </div>
  )
}
