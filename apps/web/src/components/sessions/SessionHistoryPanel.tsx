import type { SessionDetail, SessionHistoryItem } from '../../lib/api'

function completedSetsCount(detail: SessionDetail | null): number {
  if (!detail) return 0
  let done = 0
  for (const ex of detail.logged_exercises ?? []) {
    for (const st of ex.sets ?? []) {
      if (st.status === 'done') done += 1
    }
  }
  return done
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
      <div className="row" style={{ flexDirection: 'column', gap: 10 }}>
        {props.history.map(h => {
          const detail = props.historyDetails[h.id] ?? null
          const completed = completedSetsCount(detail)
          return (
            <div key={h.id} className="card" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>{h.started_at ? new Date(h.started_at).toLocaleString() : 'n/a'}</div>
                  <div className="small">{h.status} · exercises: {h.exercise_count}{detail ? ` · sets done: ${completed}` : ''}</div>
                </div>
                <button onClick={() => props.onToggleDetails(h.id)}>{detail ? 'Hide' : 'Details'}</button>
              </div>

              {detail && (
                <div style={{ marginTop: 10 }}>
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
      </div>
    </div>
  )
}
