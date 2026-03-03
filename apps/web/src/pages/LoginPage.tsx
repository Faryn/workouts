import { useState } from 'react'
import { api } from '../lib/api'

export function LoginPage({ onToken }: { onToken: (token: string) => void }) {
  const [email, setEmail] = useState('athlete@example.com')
  const [password, setPassword] = useState('secret123')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.login(email, password)
      onToken(res.access_token)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '80px auto' }}>
        <h2>Workout App Login</h2>
        <form onSubmit={submit} className="row" style={{ flexDirection: 'column' }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit">Login</button>
        </form>
        {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
      </div>
    </div>
  )
}
