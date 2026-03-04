import type { CalendarItem, ScheduledWorkout, Template } from '../../lib/api'

export function ScheduleDayDetails(props: {
  selectedDate: string
  selectedStrength: ScheduledWorkout[]
  selectedCardio: Extract<CalendarItem, { kind: 'cardio' }>[],
  templateById: Record<string, Template>
  templateNameById: Record<string, string>
  exerciseNameById: Record<string, string>
  onMove: (id: string, currentDate: string) => void
  onCopy: (id: string, currentDate: string) => void
  onSkip: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="card">
      <h3>{props.selectedDate}</h3>
      {props.selectedStrength.length === 0 && props.selectedCardio.length === 0 && <p className="small">No entries.</p>}

      {props.selectedStrength.map(it => {
        const tpl = props.templateById[it.template_id]
        return (
          <div key={it.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{props.templateNameById[it.template_id] ?? it.template_id}</strong>
              <span className="small">{it.status}</span>
            </div>

            {tpl && (
              <details style={{ marginTop: 8 }}>
                <summary className="small" style={{ cursor: 'pointer' }}>Exercises</summary>
                <ul style={{ marginTop: 6 }}>
                  {tpl.exercises
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(ex => (
                      <li key={ex.id} className="small" style={{ marginBottom: 4 }}>
                        {props.exerciseNameById[ex.exercise_id] ?? ex.exercise_name ?? ex.exercise_id} · {ex.planned_sets} × {ex.planned_reps}
                        {ex.planned_weight != null ? ` · ${ex.planned_weight} kg` : ''}
                        {ex.rest_seconds != null ? ` · rest ${ex.rest_seconds}s` : ''}
                      </li>
                    ))}
                </ul>
              </details>
            )}

            <div className="row" style={{ marginTop: 8 }}>
              {it.status === 'planned' && <a className="button-link" href={`/sessions?scheduled_id=${it.id}`}>Start</a>}
              <button onClick={() => props.onMove(it.id, it.date)}>Move</button>
              <button onClick={() => props.onCopy(it.id, it.date)}>Copy</button>
              {it.status === 'planned' && <button onClick={() => props.onSkip(it.id)}>Skip</button>}
              <button onClick={() => props.onDelete(it.id)}>Delete</button>
            </div>
          </div>
        )
      })}

      {props.selectedCardio.map(item => (
        <div key={item.id} className="small" style={{ marginBottom: 8 }}>
          🏃 {item.type} ({item.duration_seconds}s)
        </div>
      ))}
    </div>
  )
}
