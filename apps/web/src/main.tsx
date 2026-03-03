import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './lib/api'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { SchedulePage } from './pages/SchedulePage'
import { SessionsPage } from './pages/SessionsPage'
import './styles.css'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [me, setMe] = useState<{ id: string; email: string; role: string } | null>(null)

  useEffect(() => {
    if (!token) return
    localStorage.setItem('token', token)
    api.me(token).then(setMe).catch(() => {
      setToken(null)
      localStorage.removeItem('token')
    })
  }, [token])

  if (!token) return <LoginPage onToken={setToken} />
  if (!me) return <div className="container"><div className="card">Loading profile...</div></div>

  return (
    <BrowserRouter>
      <Layout onLogout={() => { setToken(null); localStorage.removeItem('token') }}>
        <Routes>
          <Route path="/" element={<DashboardPage me={me} />} />
          <Route path="/templates" element={<TemplatesPage token={token} />} />
          <Route path="/schedule" element={<SchedulePage token={token} athleteId={me.id} />} />
          <Route path="/sessions" element={<SessionsPage token={token} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
