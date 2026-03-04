import { useEffect, useState } from 'react'
import { api, type AdminUser } from '../lib/api'
import { errorMessage } from '../lib/errors'

export function AdminUsersPage({ token, me }: { token: string; me: { role: string } }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'athlete' | 'trainer' | 'admin'>('athlete')
  const [password, setPassword] = useState('')

  if (me.role !== 'admin') {
    return <div className="card"><p>Admin access required.</p></div>
  }

  async function load() {
    setErr(null)
    try {
      const rows = await api.listUsers(token)
      setUsers(rows)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createUser() {
    if (!email || !password) return
    try {
      await api.createUser(token, { email, role, password, active: true })
      setEmail('')
      setPassword('')
      setRole('athlete')
      await load()
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  return (
    <>
      <div className="card">
        <h2>Admin · Users</h2>
        <div className="row">
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <select value={role} onChange={e => setRole(e.target.value as 'athlete' | 'trainer' | 'admin')}>
            <option value="athlete">athlete</option>
            <option value="trainer">trainer</option>
            <option value="admin">admin</option>
          </select>
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={() => void createUser()} disabled={!email || password.length < 8}>Create user</button>
        </div>
      </div>

      <div className="card">
        <h3>Existing users</h3>
        <ul>
          {users.map(u => (
            <li key={u.id} style={{ marginBottom: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{u.email} · {u.role} · {u.active ? 'active' : 'inactive'}</span>
                <div className="row">
                  <button onClick={() => {
                    const next = prompt('New role (athlete|trainer|admin):', u.role)
                    if (!next || !['athlete', 'trainer', 'admin'].includes(next)) return
                    void api.patchUser(token, u.id, { role: next as 'athlete' | 'trainer' | 'admin' }).then(load).catch((e: unknown) => setErr(errorMessage(e)))
                  }}>Role</button>
                  <button onClick={() => {
                    void api.patchUser(token, u.id, { active: !u.active }).then(load).catch((e: unknown) => setErr(errorMessage(e)))
                  }}>{u.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => {
                    const next = prompt('New password (min 8 chars):')
                    if (!next || next.length < 8) return
                    void api.resetUserPassword(token, u.id, next).catch((e: unknown) => setErr(errorMessage(e)))
                  }}>Reset Password</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>
    </>
  )
}
