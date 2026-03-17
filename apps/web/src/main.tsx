import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireRole } from './components/RoleRoute'
import { api, type AthleteLite, type Me } from './lib/api'
import { AUTH_EXPIRED_EVENT, resetAuthExpiryNotification } from './lib/api/client'
import { sessionMarkerStorage } from './lib/storage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { LoginPage } from './pages/LoginPage'
import { SessionsPage } from './pages/SessionsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${__APP_VERSION__}`)
      .then(async (reg) => {
        await reg.update()
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs
          .filter(r => r.scope.startsWith(window.location.origin))
          .map(async r => {
            try {
              await r.update()
            } catch {
              // ignore stale registration update failures
            }
          }))
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys
            .filter(k => k.startsWith('workout-web-') && !k.endsWith(__APP_VERSION__))
            .map(k => caches.delete(k)))
        }
      })
      .catch(() => {
        // no-op for local/dev failures
      })
  })
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(sessionMarkerStorage.get() ? true : null)
  const [me, setMe] = useState<Me | null>(null)
  const [athleteOptions, setAthleteOptions] = useState<AthleteLite[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)

  function clearAuthState() {
    setAuthenticated(false)
    setMe(null)
    setAthleteOptions([])
    setSelectedAthleteId(null)
    sessionMarkerStorage.clear()
    resetAuthExpiryNotification()
  }

  useEffect(() => {
    if (authenticated === false) return
    api.me().then(async user => {
      resetAuthExpiryNotification()
      sessionMarkerStorage.set()
      setAuthenticated(true)
      setMe(user)
      const athletes = await api.assignedAthletes()
      setAthleteOptions(athletes)
      const defaultAthlete = user.role === 'athlete' ? user.id : (athletes[0]?.id ?? null)
      setSelectedAthleteId(defaultAthlete)
    }).catch(() => {
      clearAuthState()
    })
  }, [authenticated])

  useEffect(() => {
    const onAuthExpired = () => {
      clearAuthState()
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [])

  if (authenticated === null) return <div className="container"><div className="card">Loading profile...</div></div>
  if (!authenticated) return <LoginPage onLogin={() => setAuthenticated(true)} />
  if (!me) return <div className="container"><div className="card">Loading profile...</div></div>

  const needsAthleteContext = me.role !== 'admin'
  const hasAthleteContext = !needsAthleteContext || selectedAthleteId !== null

  if (!hasAthleteContext) {
    return (
      <BrowserRouter>
        <Layout
          me={me}
          athleteOptions={athleteOptions}
          selectedAthleteId={selectedAthleteId}
          onSelectAthlete={setSelectedAthleteId}
          onLogout={() => { void logout() }}
        >
          <div className="card">
            <h3>No athlete selected</h3>
            <p className="small">This account does not currently have an athlete context. Assign an athlete to this trainer account or log in as an athlete.</p>
          </div>
        </Layout>
      </BrowserRouter>
    )
  }

  const athleteId = selectedAthleteId as string
  const token = ''

  async function logout() {
    try {
      await api.logout()
    } finally {
      clearAuthState()
    }
  }

  return (
    <BrowserRouter>
      <Layout
        me={me}
        athleteOptions={athleteOptions}
        selectedAthleteId={selectedAthleteId}
        onSelectAthlete={setSelectedAthleteId}
        onLogout={() => { void logout() }}
      >
        <Routes>
          <Route
            path="/"
            element={me.role === 'admin'
              ? <Navigate to="/admin/users" replace />
              : <DashboardPage me={me} token={token} athleteId={athleteId} />}
          />
          <Route
            path="/templates"
            element={
              <RequireRole role={me.role} allow={['athlete', 'trainer']} fallbackTo="/admin/users">
                <TemplatesPage token={token} me={me} athleteId={athleteId} />
              </RequireRole>
            }
          />
          <Route
            path="/sessions"
            element={
              <RequireRole role={me.role} allow={['athlete']} fallbackTo={me.role === 'admin' ? '/admin/users' : '/'}>
                <SessionsPage token={token} athleteId={athleteId} />
              </RequireRole>
            }
          />
          <Route
            path="/schedule"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role={me.role} allow={['admin']}>
                <AdminUsersPage token={token} me={me} />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to={me.role === 'admin' ? '/admin/users' : '/'} replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
