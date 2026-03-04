import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { api, type AthleteLite, type Me } from './lib/api'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SchedulePage } from './pages/SchedulePage'
import { SessionsPage } from './pages/SessionsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import './styles.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [me, setMe] = useState<Me | null>(null)
  const [athleteOptions, setAthleteOptions] = useState<AthleteLite[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    localStorage.setItem('token', token)
    api.me(token).then(async user => {
      setMe(user)
      const athletes = await api.assignedAthletes(token)
      setAthleteOptions(athletes)
      const defaultAthlete = user.role === 'athlete' ? user.id : (athletes[0]?.id ?? user.id)
      setSelectedAthleteId(defaultAthlete)
    }).catch(() => {
      setToken(null)
      localStorage.removeItem('token')
    })
  }, [token])

  if (!token) return <LoginPage onToken={setToken} />
  if (!me || !selectedAthleteId) return <div className="container"><div className="card">Loading profile...</div></div>

  return (
    <BrowserRouter>
      <Layout
        me={me}
        athleteOptions={athleteOptions}
        selectedAthleteId={selectedAthleteId}
        onSelectAthlete={setSelectedAthleteId}
        onLogout={() => {
          setToken(null)
          localStorage.removeItem('token')
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage me={me} token={token} athleteId={selectedAthleteId} />} />
          <Route path="/templates" element={<TemplatesPage token={token} />} />
          <Route path="/schedule" element={<SchedulePage token={token} athleteId={selectedAthleteId} />} />
          <Route path="/sessions" element={<SessionsPage token={token} athleteId={selectedAthleteId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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
