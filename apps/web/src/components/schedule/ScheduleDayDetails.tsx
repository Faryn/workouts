import { useState } from 'react'
import type { CalendarItem, ScheduledWorkout, Template } from '../../lib/api'

function badgeClass(status: string) {
  switch (status) {
    case 'completed': return 'status-badge status-completed'
    case 'planned': return 'status-badge status-planned'
    case 'skipped': return 'status-badge status-skipped'
    default: return 'status-badge status-in_progress'
  }
}

export function ScheduleDayDetails(props: {
  selectedDate: string
  selectedStrength: ScheduledWorkout[]
  selectedCardio: Extract<CalendarItem, { kind: 'cardio' }>[],
  templateById: Record<string, Template>
  templateNameById: Record<string, string>
  exerciseNameById: Record<string, string>
  onMove: (id: string, toDate: string) => void
  onCopy: (id: string, toDate: string) => void
  onSkip: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [actionModeById, setActionModeById] = useState<Record<string, 'move' | 'copy' | null>>({})
  const [actionDateById, setActionDateById] = useState<Record<string, string>>({})

  function openAction(id: string, mode: 'move' | 'copy') {
    const today = new Date().toISOString().slice(0, 10)
    setActionModeById(prev => ({ ...prev, [id]: mode }))
    setActionDateById(prev => ({ ...prev, [id]: prev[id] ?? today }))
  }

  function closeAction(id: string) {
    setActionModeById(prev => ({ ...prev, [id]: null }))
  }

  return (
    <div className="card">
      <h3>📅 {props.selectedDate}</h3>
      {props.selectedStrength.length === 0 && props.selectedCardio.length === 0 && <p className="small">No entries.</p>}

      {props.selectedStrength.map(it => {
        const tpl = props.templateById[it.template_id]
        const actionMode = actionModeById[it.id]
        const actionDate = actionDateById[it.id] ?? it.date
        return (
          <div key={it.id} className="history-card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>🏋 {props.templateNameById[it.template_id] ?? it.template_id}</strong>
              <span className={badgeClass(it.status)}>{it.status}</span>
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

            <div className="row action-row" style={{ marginTop: 8 }}>
              {it.status === 'planned' && <a className="button-link" href={`/sessions?scheduled_id=${it.id}`}><span className="button-icon">▶</span>Start workout</a>}
              <button onClick={() => openAction(it.id, 'move')}><span className="button-icon">↔</span>Move workout</button>
              <button onClick={() => openAction(it.id, 'copy')}><span className="button-icon">⧉</span>Copy workout</button>
              {it.status === 'planned' && <button onClick={() => props.onSkip(it.id)}><span className="button-icon">⏭</span>Skip workout</button>}
              <button onClick={() => props.onDelete(it.id)}><span className="button-icon">🗑</span>Delete workout</button>
            </div>

            {actionMode && (
              <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
                <span className="small">{actionMode === 'move' ? 'Move to' : 'Copy to'}</span>
                <input
                  type="date"
                  value={actionDate}
                  onChange={e => setActionDateById(prev => ({ ...prev, [it.id]: e.target.value }))}
                />
                <button
                  className="primary"
                  onClick={() => {
                    if (actionMode === 'move') props.onMove(it.id, actionDate)
                    if (actionMode === 'copy') props.onCopy(it.id, actionDate)
                    closeAction(it.id)
                  }}
                >
                  <span className="button-icon">✓</span>{actionMode === 'move' ? 'Confirm move' : 'Confirm copy'}
                </button>
                <button className="ghost" onClick={() => closeAction(it.id)}>Cancel</button>
              </div>
            )}
          </div>
        )
      })}

      {props.selectedCardio.map(item => (
        <div key={item.id} className="history-card" style={{ marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>🏃 {item.type}</strong>
              <div className="small">{item.duration_seconds}s{item.distance != null ? ` · ${item.distance} km` : ''}</div>
            </div>
            <span className="status-badge status-in_progress">cardio</span>
          </div>
        </div>
      ))}
    </div>
  )
}
