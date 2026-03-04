import { NavLink } from 'react-router-dom'

type AthleteLite = { id: string; email: string }

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
  me: { id: string; email: string; role: string }
  athleteOptions: AthleteLite[]
  selectedAthleteId: string
  onSelectAthlete: (id: string) => void
}) {
  return (
    <div className="container">
      <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row">
          {me.role === 'admin' ? (
            <NavLink to="/admin/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Users</NavLink>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
              <NavLink to="/templates" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Plans</NavLink>
              <NavLink to="/schedule" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Week</NavLink>
              {me.role === 'athlete' && (
                <NavLink to="/sessions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Gym</NavLink>
              )}
            </>
          )}
        </div>
        <div className="row" style={{ alignItems: 'center' }}>
{me.role === 'trainer' && athleteOptions.length > 0 && (
            <select value={selectedAthleteId} onChange={e => onSelectAthlete(e.target.value)}>
              {athleteOptions.map(a => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          )}
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>
      {children}
    </div>
  )
}
