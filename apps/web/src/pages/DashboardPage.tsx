export function DashboardPage({ me }: { me: { id: string; email: string; role: string } }) {
  return (
    <div className="card">
      <h2>Dashboard</h2>
      <p><strong>User:</strong> {me.email}</p>
      <p><strong>Role:</strong> {me.role}</p>
      <p className="small">Current frontend covers templates, scheduling, and session execution against implemented API endpoints.</p>
    </div>
  )
}
