type TemplateLite = { id: string; name: string }
type ScheduledLite = { id: string; date: string; template_id: string; status: string }

function friendlyDateLabel(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function SessionStarter(props: {
  templates: TemplateLite[]
  scheduledItems: ScheduledLite[]
  templateId: string
  scheduledId: string
  templateNameById: Record<string, string>
  hasActiveSession: boolean
  onTemplateId: (v: string) => void
  onScheduledId: (v: string) => void
  onStartFromTemplate: () => void
  onStartFromScheduled: (scheduledWorkoutId?: string) => void
  onResume: () => void
  err?: string | null
}) {
  const planned = props.scheduledItems
    .filter(item => item.status === 'planned')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString().slice(0, 10)
  const todaysWorkout = planned.find(item => item.date === todayIso) ?? null
  const nextWorkout = planned.find(item => item.date >= todayIso) ?? planned[0] ?? null
  const priorityWorkout = todaysWorkout ?? nextWorkout
  const selectedWorkout = planned.find(item => item.id === props.scheduledId) ?? null
  const showPlannedOptions = planned.length > 0

  return (
    <div className="card train-page-starter">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Train</h2>
        </div>
      </div>

      {props.hasActiveSession ? (
        <div className="train-priority-card">
          <div>
            <h3>Resume your workout</h3>
          </div>
          <button className="primary" onClick={props.onResume}>Resume workout</button>
        </div>
      ) : priorityWorkout ? (
        <div className="train-priority-card">
          <div>
            <h3>{props.templateNameById[priorityWorkout.template_id] ?? 'Planned workout'}</h3>
            <div className="small">{friendlyDateLabel(priorityWorkout.date)} · planned workout</div>
          </div>
          <button
            className="primary"
            onClick={() => {
              props.onScheduledId(priorityWorkout.id)
              props.onStartFromScheduled(priorityWorkout.id)
            }}
          >
            {todaysWorkout ? 'Start today’s workout' : 'Start planned workout'}
          </button>
        </div>
      ) : (
        <div className="train-priority-card">
          <div>
            <h3>Start an unscheduled workout</h3>
          </div>
        </div>
      )}

      <div className="train-secondary-grid">
        {showPlannedOptions && (
          <section className="train-secondary-card">
            <div>
              <h3 style={{ marginBottom: 6 }}>Other planned workouts</h3>
            </div>
            <div className="stack">
              <label className="stack" style={{ flex: 1 }}>
                <span className="small">Planned workout</span>
                <select aria-label="Select planned workout" value={props.scheduledId} onChange={e => props.onScheduledId(e.target.value)}>
                  <option value="">Choose planned workout</option>
                  {planned.map(s => (
                    <option key={s.id} value={s.id}>
                      {friendlyDateLabel(s.date)} · {props.templateNameById[s.template_id] ?? s.template_id}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => props.onStartFromScheduled()} disabled={!props.scheduledId}>
                Start planned workout
              </button>
              {selectedWorkout && (
                <div className="small">Selected: {props.templateNameById[selectedWorkout.template_id] ?? selectedWorkout.template_id} · {friendlyDateLabel(selectedWorkout.date)}</div>
              )}
            </div>
          </section>
        )}

        <section className="train-secondary-card">
          <div>
            <h3 style={{ marginBottom: 6 }}>Start from a program</h3>
          </div>
          <div className="stack">
            <label className="stack" style={{ flex: 1 }}>
              <span className="small">Workout program</span>
              <select aria-label="Select template" value={props.templateId} onChange={e => props.onTemplateId(e.target.value)}>
                <option value="">Select program</option>
                {props.templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={props.onStartFromTemplate} disabled={!props.templateId}>
              Start unscheduled workout
            </button>
          </div>
        </section>
      </div>

      {props.err && <p style={{ color: 'var(--danger)' }} role="alert">{props.err}</p>}
    </div>
  )
}
