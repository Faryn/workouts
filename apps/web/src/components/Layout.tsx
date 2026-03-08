import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

type AthleteLite = { id: string; email: string; name?: string | null }

export function Layout({
  children,
  onLogout,
  me,
  athleteOptions,
  selectedAthleteId,
  onSelectAthlete,
}: {
  children: React.ReactNode
  onLogout: () => void
  me: { id: string; email: string; name?: string | null; role: string }
  athleteOptions: AthleteLite[]
  selectedAthleteId: string | null
  onSelectAthlete: (id: string) => void
}) {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const selectedAthlete = athleteOptions.find(a => a.id === selectedAthleteId)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const currentSectionLabel = useMemo(() => {
    if (me.role === 'admin') return 'Users'
    if (location.pathname.startsWith('/sessions')) return 'Train'
    if (location.pathname.startsWith('/templates')) return 'Programs'
    return 'Dashboard'
  }, [location.pathname, me.role])

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <div className="mobile-topbar-main">
          <button
            type="button"
            className="ghost mobile-nav-toggle"
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(open => !open)}
          >
            <span className="button-icon">☰</span>
          </button>
          <div>
            <div className="mobile-topbar-kicker">Workout app</div>
            <strong>{currentSectionLabel}</strong>
          </div>
        </div>
      </header>

      <div
        className={`mobile-nav-backdrop${mobileNavOpen ? ' open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden={!mobileNavOpen}
      />

      <aside className={`app-sidebar${mobileNavOpen ? ' mobile-open' : ''}`}>
        <div className="brand-block">
          <div className="brand-eyebrow">Workout app</div>
          <div className="brand-title">Stronger, simpler coaching</div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {me.role === 'admin' ? (
            <NavLink to="/admin/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Users</NavLink>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/templates" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Programs</NavLink>
              {me.role === 'athlete' && (
                <NavLink to="/sessions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Train</NavLink>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {me.role === 'trainer' && athleteOptions.length > 0 && (
            <label className="stack">
              <span className="small">Athlete</span>
              <select aria-label="Selected athlete" value={selectedAthleteId ?? ''} onChange={e => onSelectAthlete(e.target.value)}>
                {athleteOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.name || a.email}</option>
                ))}
              </select>
            </label>
          )}
          <button onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <main className="app-main">
        {me.role === 'trainer' && selectedAthlete && (
          <div className="context-banner" role="status" aria-live="polite">
            <div className="small">Trainer context</div>
            <strong>Viewing {selectedAthlete.name || selectedAthlete.email}</strong>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
