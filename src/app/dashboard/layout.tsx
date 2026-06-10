'use client'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CirclePlus,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { authHeaders, getAccessToken } from '@/lib/client-auth'

interface SidebarUser {
  firstName: string
  lastName: string
  email: string
}

const navItems = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/meters', label: 'Meters', Icon: Zap },
  { href: '/dashboard/purchase', label: 'Buy Units', Icon: CirclePlus },
  { href: '/dashboard/transactions', label: 'Transactions', Icon: ReceiptText },
  { href: '/dashboard/profile', label: 'Profile', Icon: UserRound },
] satisfies Array<{ href: string; label: string; Icon: LucideIcon }>

function isActivePath(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

function isUnexpiredJwt(token: string | null) {
  if (!token) return false

  try {
    const [, payload] = token.split('.')
    if (!payload) return false
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')

    const decoded = JSON.parse(window.atob(normalizedPayload)) as {
      exp?: number
    }

    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export default function DashboardLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SidebarUser | null>(null)
  const [authState, setAuthState] = useState<'checking' | 'authenticated'>('checking')

  useEffect(() => {
    let active = true

    async function fetchCurrentUser(headers = authHeaders()) {
      const response = await fetch('/api/auth/me', {
        headers,
        credentials: 'same-origin',
      })

      if (!response.ok) return null

      const data = await response.json()
      return (data.user ?? null) as SidebarUser | null
    }

    async function redirectToLogin() {
      window.localStorage.removeItem('accessToken')
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {})

      const next = `${window.location.pathname}${window.location.search}`
      router.replace(`/auth/login?next=${encodeURIComponent(next)}`)
    }

    async function loadUser() {
      try {
        const accessToken = getAccessToken()
        const currentUser = isUnexpiredJwt(accessToken)
          ? await fetchCurrentUser()
          : null

        if (currentUser) {
          if (active) {
            setUser(currentUser)
            setAuthState('authenticated')
          }
          return
        }

        if (accessToken && !isUnexpiredJwt(accessToken)) {
          window.localStorage.removeItem('accessToken')
        }

        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        })

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json()

          if (tokens.accessToken) {
            window.localStorage.setItem('accessToken', tokens.accessToken)
          }

          const refreshedUser = await fetchCurrentUser(
            tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : authHeaders(),
          )

          if (refreshedUser) {
            if (active) {
              setUser(refreshedUser)
              setAuthState('authenticated')
            }
            return
          }
        }

        if (active) await redirectToLogin()
      } catch {
        if (active) await redirectToLogin()
      }
    }

    loadUser()
    window.addEventListener('profile:updated', loadUser)

    return () => {
      active = false
      window.removeEventListener('profile:updated', loadUser)
    }
  }, [router])

  const handleSignOut = async () => {
    window.localStorage.removeItem('accessToken')
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => {})
    router.replace('/auth/login')
  }

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Loading profile'
  const initials = user
    ? `${user.firstName.at(0) ?? ''}${user.lastName.at(0) ?? ''}`.toUpperCase()
    : '--'
  const activeItem = navItems.find(item => isActivePath(pathname, item.href)) ?? navItems[0]
  const ActiveIcon = activeItem.Icon

  if (authState === 'checking') {
    return (
      <div className="dashboard-auth-loading">
        <div className="dashboard-logo-mark">
          <Zap size={16} strokeWidth={2.4} />
        </div>
        <div>
          <div className="dashboard-auth-loading-title">Checking session</div>
          <div className="dashboard-auth-loading-copy">Redirecting if your session has expired.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        {/* Logo */}
        <div className="dashboard-logo">
          <div className="dashboard-logo-row">
            <div className="dashboard-logo-mark">
              <Zap size={16} strokeWidth={2.4} />
            </div>
            <div>
              <div className="dashboard-logo-title">PowerPay</div>
              <div className="dashboard-logo-subtitle">Smart Tokens</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="dashboard-sidebar-nav" aria-label="Dashboard menu">
          <div className="dashboard-nav-kicker">Menu</div>
          {navItems.map(item => {
            const active = isActivePath(pathname, item.href)
            const ItemIcon = item.Icon
            return (
              <Link
                key={item.href}
                className={`dashboard-sidebar-link${active ? ' dashboard-sidebar-link-active' : ''}`}
                href={item.href}
              >
                <ItemIcon size={16} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="dashboard-sidebar-footer">
          <Link className="dashboard-user-card" href="/dashboard/profile">
            <div className="dashboard-user-avatar">{initials}</div>
            <div className="dashboard-user-text">
              <div className="dashboard-user-name">{userName}</div>
              <div className="dashboard-user-email">{user?.email ?? 'Checking session...'}</div>
            </div>
          </Link>
          <button className="dashboard-signout-link" onClick={handleSignOut} type="button">
            <LogOut size={14} strokeWidth={1.9} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-navbar">
          <div className="navbar-current">
            <div className="navbar-current-icon">
              <ActiveIcon size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="navbar-kicker">Dashboard</div>
              <div className="navbar-title">{activeItem.label}</div>
            </div>
          </div>

          <div className="navbar-actions">
            <Link className="navbar-user-chip" href="/dashboard/profile" aria-label="Open profile">
              <span className="navbar-avatar">{initials}</span>
              <span className="navbar-user-name">{userName}</span>
            </Link>
            <Link className="navbar-primary-action" href="/dashboard/purchase">
              <CirclePlus size={16} strokeWidth={2.1} />
              <span>Buy Units</span>
            </Link>
          </div>
        </header>

        <div className="dashboard-content">
          {children}
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile dashboard navigation">
        {navItems.map(item => {
          const active = isActivePath(pathname, item.href)
          const ItemIcon = item.Icon
          return (
            <Link
              key={item.href}
              aria-label={item.label}
              className={`mobile-bottom-nav-item${active ? ' mobile-bottom-nav-item-active' : ''}`}
              href={item.href}
              title={item.label}
            >
              <ItemIcon size={19} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      {modal}
    </div>
  )
}
