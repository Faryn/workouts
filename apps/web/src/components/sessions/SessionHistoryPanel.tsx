import type { SessionDetail, SessionHistoryItem } from '../../lib/api'

function setCounts(detail: SessionDetail | null) {
  if (!detail) return { done: 0, skipped: 0, total: 0 }
  let done = 0
  let skipped = 0
  let total = 0
  for (const ex of detail.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      total += 1
      if (st.status === 'done') done += 1
      if (st.status === 'skipped') skipped += 1
    }
  }
  return { done, skipped, total }
}

function badgeClass(status: string) {
  switch (status) {
    case 'completed': return 'status-badge status-completed'
    case 'planned': return 'status-badge status-planned'
    case 'skipped': return 'status-badge status-skipped'
    case 'in_progress': return 'status-badge status-in_progress'
    default: return 'status-badge'
  }
}

export function SessionHistoryPanel(props: {
  history: SessionHistoryItem[]
  historyDetails: Record<string, SessionDetail | null>
  exerciseNameById: Record<string, string>
  onToggleDetails: (sessionId: string) => void
}) {
  return (
    <div className="card">
      <h3>History</h3>
      <div className="stack">
        {props.history.map(h => {
          const detail = props.historyDetails[h.id] ?? null
          const counts = setCounts(detail)
          return (
            <div key={h.id} className="history-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div><strong>{h.started_at ? new Date(h.started_at).toLocaleString() : 'n/a'}</strong></div>
                  <div className="small">
                    {h.duration_seconds != null ? `${Math.round(h.duration_seconds / 60)} min` : 'duration n/a'} · {h.exercise_count} exercises
                  </div>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className={badgeClass(h.status)}>{h.status}</span>
                  <button onClick={() => props.onToggleDetails(h.id)}>{detail ? 'Hide' : 'Details'}</button>
                </div>
              </div>

              <div className="row small" style={{ marginBottom: detail ? 10 : 0 }}>
                <span>Done sets: <strong>{counts.done}</strong></span>
                <span>Skipped: <strong>{counts.skipped}</strong></span>
                <span>Total: <strong>{counts.total || '—'}</strong></span>
              </div>

              {detail && (
                <div>
                  {detail.logged_exercises.map(ex => (
                    <details key={ex.id} style={{ marginBottom: 8 }}>
                      <summary>
                        {(props.exerciseNameById[ex.exercise_id] ?? ex.exercise_id)}
                      </summary>
                      <ul style={{ marginTop: 6 }}>
                        {ex.sets.map(st => {
                          const usesWeight = st.planned_weight != null || st.actual_weight != null
                          return (
                            <li key={st.id} className="small" style={{ marginBottom: 4 }}>
                              Set {st.set_number}:
                              {usesWeight
                                ? ` planned ${st.planned_weight ?? '-'} kg × ${st.planned_reps ?? '-'} reps · actual ${st.actual_weight ?? '-'} kg × ${st.actual_reps ?? '-'} reps`
                                : ` planned ${st.planned_reps ?? '-'} reps · actual ${st.actual_reps ?? '-'} reps`} · {st.status}
                            </li>
                          )
                        })}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {props.history.length === 0 && <div className="small">No training history yet.</div>}
      </div>
    </div>
  )
}
