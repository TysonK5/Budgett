import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DateRangeProvider } from '@/context/DateRangeContext'
import { GlobalDateRangeBar } from '@/components/GlobalDateRangeBar'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/upload', label: 'Upload', icon: '📁' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
  { to: '/rules', label: 'Rules', icon: '🏷️' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

const SIDEBAR_KEY = 'budgett-sidebar-collapsed'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed((c) => !c)

  return (
    <DateRangeProvider>
      <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <aside
          className={`sidebar ${menuOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}
          aria-label="Main navigation"
        >
          <div className="sidebar-brand">
            <span className="brand-icon" aria-hidden>
              💰
            </span>
            <span className="brand-name">Budgett</span>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
          <nav className="sidebar-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
                title={item.label}
              >
                <span className="nav-icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="sidebar-footer-text text-xs">Local-first · Offline ready</span>
            <button
              type="button"
              className="sidebar-collapse-btn sidebar-collapse-btn--footer"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
        </aside>

        {menuOpen && (
          <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
        )}

        <div className="main-area">
          <header className="app-top-chrome">
            <div className="app-top-chrome-left">
              <button
                type="button"
                className="btn-icon mobile-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                ☰
              </button>
              <div className="topbar-title mobile-only-title">Budgett</div>
            </div>
            <GlobalDateRangeBar />
          </header>
          <main className="page-content fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </DateRangeProvider>
  )
}
