import { useEffect, useMemo, useState } from 'react'
import { api, type CalendarItem } from '../lib/api'
import { errorMessage } from '../lib/errors'

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function DashboardPage({ me, token, athleteId }: { me: { id: string; email: string; role: string }; token: string; athleteId: string }) {
  const [err, setErr] = useState<string | null>(null)
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])

  const range = useMemo(() => {
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 14)
    return { from: iso(from), to: iso(to) }
  }, [])

  useEffect(() => {
    api
      .listCalendar(token, athleteId, range.from, range.to)
      .then(setCalendarItems)
      .catch((e: unknown) => setErr(errorMessage(e)))
  }, [token, athleteId, range.from, range.to])

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

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <p><strong>User:</strong> {me.email}</p>
      <p><strong>Role:</strong> {me.role}</p>
      <p className="small">Current frontend covers templates, scheduling, sessions, and CSV exports.</p>

      <div className="row" style={{ marginBottom: 12 }}>
        {todaysPlanned && (
          <a href={`/sessions?scheduled_id=${todaysPlanned.id}`}>
            <button>Start today’s workout</button>
          </a>
        )}
        <button onClick={() => void run(() => api.exportSessionsCsv(token, athleteId))}>Export Sessions CSV</button>
        <button onClick={() => void run(() => api.exportExerciseHistoryCsv(token, athleteId))}>Export Exercise History CSV</button>
        <button onClick={() => void run(() => api.exportCardioCsv(token, athleteId))}>Export Cardio CSV</button>
      </div>

      <h3>Upcoming Calendar (14 days)</h3>
      <ul>
        {calendarItems.map(item => (
          <li key={`${item.kind}-${item.id}`} style={{ marginBottom: 6 }}>
            {item.date} · {item.kind === 'strength' ? `🏋️ ${item.template_name} (${item.status})` : `🏃 ${item.type} (${item.duration_seconds}s)`}
            {item.kind === 'strength' && item.status === 'planned' && (
              <a className="button-link" href={`/sessions?scheduled_id=${item.id}`} style={{ marginLeft: 8 }}>Start</a>
            )}
          </li>
        ))}
        {calendarItems.length === 0 && <li className="small">No entries in the next 14 days.</li>}
      </ul>

      {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
    </div>
  )
}
