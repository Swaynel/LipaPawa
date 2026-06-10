'use client'
import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CirclePlus,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { authHeaders } from '@/lib/client-auth'

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

export default function DashboardLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = useState<SidebarUser | null>(null)

  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', { headers: authHeaders() })
        const data = await response.json()

        if (active) {
          setUser(data.user ?? null)
        }
      } catch {
        if (active) setUser(null)
      }
    }

    loadUser()
    window.addEventListener('profile:updated', loadUser)

    return () => {
      active = false
      window.removeEventListener('profile:updated', loadUser)
    }
  }, [])

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Loading profile'
  const initials = user
    ? `${user.firstName.at(0) ?? ''}${user.lastName.at(0) ?? ''}`.toUpperCase()
    : '--'
  const activeItem = navItems.find(item => isActivePath(pathname, item.href)) ?? navItems[0]
  const ActiveIcon = activeItem.Icon

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
          <Link className="dashboard-signout-link" href="/auth/login">
            <LogOut size={14} strokeWidth={1.9} />
            <span>Sign out</span>
          </Link>
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

          <nav className="navbar-links" aria-label="Primary dashboard navigation">
            {navItems.map(item => {
              const active = isActivePath(pathname, item.href)
              const ItemIcon = item.Icon
              return (
                <Link
                  key={item.href}
                  className={`navbar-link${active ? ' navbar-link-active' : ''}`}
                  href={item.href}
                >
                  <ItemIcon size={15} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

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
      {modal}
    </div>
  )
}
