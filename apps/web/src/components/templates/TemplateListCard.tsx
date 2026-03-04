import type { Template } from '../../lib/api'

export function TemplateListCard(props: {
  items: Template[]
  exerciseNameById: Record<string, string>
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="card">
      <h3>Existing</h3>
      <ul>
        {props.items.map(t => (
          <li key={t.id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span>
                {t.name} <span className="small">{t.notes ?? ''}</span>
                <span className="small" style={{ marginLeft: 8 }}>({t.exercises.length} exercises)</span>
              </span>
              <div className="row">
                {t.can_manage !== false && <button onClick={() => props.onEdit(t.id)}>Edit</button>}
                {t.can_manage !== false && <button onClick={() => props.onDelete(t.id)}>Delete</button>}
              </div>
            </div>

            <details>
              <summary className="small" style={{ cursor: 'pointer' }}>Show exercises</summary>
              <ul style={{ marginTop: 6 }}>
                {t.exercises
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
          </li>
        ))}
      </ul>
    </div>
  )
}
