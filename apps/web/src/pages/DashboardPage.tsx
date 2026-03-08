import { useEffect, useMemo, useState } from 'react'
import { api, type CalendarItem, type SessionDetail } from '../lib/api'
import { errorMessage } from '../lib/errors'

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function badgeClass(item: CalendarItem) {
  if (item.kind === 'cardio') return 'status-badge status-in_progress'
  switch (item.status) {
    case 'completed': return 'status-badge status-completed'
    case 'skipped': return 'status-badge status-skipped'
    default: return 'status-badge status-planned'
  }
}

export function DashboardPage({ me, token, athleteId }: { me: { id: string; email: string; role: string }; token: string; athleteId: string }) {
  const [err, setErr] = useState<string | null>(null)
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [inProgress, setInProgress] = useState<SessionDetail | null>(null)

  const range = useMemo(() => {
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 14)
    return { from: iso(from), to: iso(to) }
  }, [])

  useEffect(() => {
    Promise.all([
      api.listCalendar(token, athleteId, range.from, range.to),
      me.role === 'athlete' ? api.latestInProgressSession(token, athleteId) : Promise.resolve(null),
    ])
      .then(([items, latest]) => {
        setCalendarItems(items)
        setInProgress(latest)
      })
      .catch((e: unknown) => setErr(errorMessage(e)))
  }, [token, athleteId, range.from, range.to, me.role])

  async function run(task: () => Promise<void>) {
    setErr(null)
    try {
      await task()
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  const today = iso(new Date())
  const todaysPlanned = calendarItems.find(i => i.kind === 'strength' && i.status === 'planned' && i.date === today)
  const upcomingStrength = calendarItems.filter(i => i.kind === 'strength').slice(0, 5)
  const completedCount = calendarItems.filter(i => i.kind === 'strength' && i.status === 'completed').length
  const plannedCount = calendarItems.filter(i => i.kind === 'strength' && i.status === 'planned').length

  return (
    <div className="stack">
      <div className="card dashboard-hero">
        <div>
          <h2>Dashboard</h2>
          <p><strong>User:</strong> {me.email}</p>
          <p><strong>Role:</strong> {me.role}</p>
          <p className="small">Current frontend covers templates, scheduling, sessions, and CSV exports.</p>
        </div>
        <div className="stack" style={{ minWidth: 280 }}>
          {me.role === 'athlete' && inProgress && (
            <div className="notice-banner">
              <div>
                <strong>Resume your workout</strong>
                <div className="small">An in-progress session is ready to continue.</div>
              </div>
              <a href="/sessions"><button className="primary">Resume</button></a>
            </div>
          )}
          {me.role === 'athlete' && !inProgress && todaysPlanned && (
            <a href={`/sessions?scheduled_id=${todaysPlanned.id}`}>
              <button className="primary" style={{ width: '100%' }}>Start today’s workout</button>
            </a>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="metric-card">
          <div className="small">Planned in next 14 days</div>
          <div className="metric-value">{plannedCount}</div>
        </div>
        <div className="metric-card">
          <div className="small">Completed in next 14 days feed</div>
          <div className="metric-value">{completedCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button onClick={() => void run(() => api.exportSessionsCsv(token, athleteId))}>Export Sessions CSV</button>
          <button onClick={() => void run(() => api.exportExerciseHistoryCsv(token, athleteId))}>Export Exercise History CSV</button>
          <button onClick={() => void run(() => api.exportCardioCsv(token, athleteId))}>Export Cardio CSV</button>
        </div>
      </div>

      <div className="card">
        <h3>This week / upcoming</h3>
        <div className="stack">
          {upcomingStrength.map(item => (
            <div key={item.id} className="history-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div><strong>{item.date}</strong> · {item.template_name}</div>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className={badgeClass(item)}>{item.status}</span>
                  {me.role === 'athlete' && item.status === 'planned' && <a className="button-link" href={`/sessions?scheduled_id=${item.id}`}>Start</a>}
                </div>
              </div>
            </div>
          ))}
          {upcomingStrength.length === 0 && <div className="small">No strength workouts planned right now.</div>}
        </div>
      </div>

      <div className="card">
        <h3>Upcoming calendar (14 days)</h3>
        <div className="stack">
          {calendarItems.map(item => (
            <div key={`${item.kind}-${item.id}`} className="history-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.date}</strong> · {item.kind === 'strength' ? `🏋️ ${item.template_name}` : `🏃 ${item.type}`}
                  <div className="small">{item.kind === 'strength' ? 'Strength workout' : `${item.duration_seconds}s cardio`}</div>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className={badgeClass(item)}>{item.kind === 'strength' ? item.status : 'cardio'}</span>
                  {me.role === 'athlete' && item.kind === 'strength' && item.status === 'planned' && (
                    <a className="button-link" href={`/sessions?scheduled_id=${item.id}`}>Start</a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {calendarItems.length === 0 && <div className="small">No entries in the next 14 days.</div>}
        </div>
      </div>

      {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
    </div>
  )
}
