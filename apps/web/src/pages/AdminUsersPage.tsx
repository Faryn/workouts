import { useEffect, useState } from 'react'
import { api, type AdminUser } from '../lib/api'
import { errorMessage } from '../lib/errors'

export function AdminUsersPage({ token, me }: { token: string; me: { role: string } }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'athlete' | 'trainer' | 'admin'>('athlete')
  const [password, setPassword] = useState('')
  const [resetForUserId, setResetForUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

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
                  <select
                    aria-label={`Role for ${u.email}`}
                    value={u.role}
                    onChange={(e) => {
                      const next = e.target.value as 'athlete' | 'trainer' | 'admin'
                      void api.patchUser(token, u.id, { role: next }).then(load).catch((e: unknown) => setErr(errorMessage(e)))
                    }}
                  >
                    <option value="athlete">athlete</option>
                    <option value="trainer">trainer</option>
                    <option value="admin">admin</option>
                  </select>
                  <button onClick={() => {
                    void api.patchUser(token, u.id, { active: !u.active }).then(load).catch((e: unknown) => setErr(errorMessage(e)))
                  }}>{u.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => {
                    setResetForUserId(u.id)
                    setNewPassword('')
                  }}>Reset Password</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      {resetForUserId && (
        <div className="card">
          <h3>Reset password</h3>
          <div className="row">
            <input
              placeholder="New password (min 8 chars)"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <button onClick={() => { setResetForUserId(null); setNewPassword('') }}>Cancel</button>
            <button
              disabled={newPassword.length < 8}
              onClick={() => {
                void api.resetUserPassword(token, resetForUserId, newPassword)
                  .then(() => {
                    setResetForUserId(null)
                    setNewPassword('')
                  })
                  .catch((e: unknown) => setErr(errorMessage(e)))
              }}
            >Save</button>
          </div>
        </div>
      )}
    </>
  )
}
