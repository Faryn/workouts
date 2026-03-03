import { Link } from 'react-router-dom'

export function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="container">
      <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row">
          <Link to="/">Dashboard</Link>
          <Link to="/templates">Templates</Link>
          <Link to="/schedule">Schedule</Link>
          <Link to="/sessions">Sessions</Link>
        </div>
        <button onClick={onLogout}>Logout</button>
      </div>
      {children}
    </div>
  )
}
