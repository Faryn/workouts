import { useState } from 'react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/errors'

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.login(email, password)
      onLogin()
    } catch (err: unknown) {
      setError(errorMessage(err))
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-overline">Workout app</p>
        <h1 id="login-title">Train with intent.</h1>
        <p className="login-intro">Your programs, sessions, and progress—kept in one focused place.</p>
        <form onSubmit={submit} className="row" style={{ flexDirection: 'column' }}>
          <label className="login-field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" /></label>
          <label className="login-field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" /></label>
          <button className="primary login-submit" type="submit">Login</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}
