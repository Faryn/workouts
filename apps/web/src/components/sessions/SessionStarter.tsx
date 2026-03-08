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
  onStartFromScheduled: () => void
  onClearDraft: () => void
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
          <div className="section-kicker">Train</div>
          <h2 style={{ marginBottom: 0 }}>Start today, not from a menu</h2>
        </div>
      </div>

      {props.hasActiveSession ? (
        <div className="train-priority-card">
          <div>
            <div className="train-priority-kicker">In progress</div>
            <h3>Resume your workout</h3>
            <div className="small">You already have a live session. Pick that up instead of starting a duplicate.</div>
          </div>
          <button className="primary" onClick={props.onResume}><span className="button-icon">▶</span>Resume workout</button>
        </div>
      ) : priorityWorkout ? (
        <div className="train-priority-card">
          <div>
            <div className="train-priority-kicker">{todaysWorkout ? 'Today’s priority' : 'Next up'}</div>
            <h3>{props.templateNameById[priorityWorkout.template_id] ?? 'Planned workout'}</h3>
            <div className="small">{friendlyDateLabel(priorityWorkout.date)} · planned workout</div>
          </div>
          <button
            className="primary"
            onClick={() => {
              props.onScheduledId(priorityWorkout.id)
              props.onStartFromScheduled()
            }}
          >
            <span className="button-icon">▶</span>
            {todaysWorkout ? 'Start today’s workout' : 'Start planned workout'}
          </button>
        </div>
      ) : (
        <div className="train-priority-card">
          <div>
            <div className="train-priority-kicker">No workout planned</div>
            <h3>Start an unscheduled workout</h3>
            <div className="small">Choose a program below if you want to train without today’s plan.</div>
          </div>
        </div>
      )}

      <div className="train-secondary-grid">
        {showPlannedOptions && (
          <section className="train-secondary-card">
            <div>
              <div className="section-kicker">Planned</div>
              <h3 style={{ marginBottom: 6 }}>Other planned workouts</h3>
              <div className="small">Use this when you want something other than the top suggestion.</div>
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
              <button onClick={props.onStartFromScheduled} disabled={!props.scheduledId}>
                <span className="button-icon">▶</span>Start planned workout
              </button>
              {selectedWorkout && (
                <div className="small">Selected: {props.templateNameById[selectedWorkout.template_id] ?? selectedWorkout.template_id} · {friendlyDateLabel(selectedWorkout.date)}</div>
              )}
            </div>
          </section>
        )}

        <section className="train-secondary-card">
          <div>
            <div className="section-kicker">Unscheduled</div>
            <h3 style={{ marginBottom: 6 }}>Start from a program</h3>
            <div className="small">For extra sessions, testing, or training outside the schedule.</div>
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
              <span className="button-icon">▶</span>Start unscheduled workout
            </button>
          </div>
        </section>
      </div>

      <div className="train-utility-row">
        <button className="ghost" onClick={props.onClearDraft}><span className="button-icon">⌫</span>Clear draft</button>
        <button className="ghost" onClick={props.onResume}><span className="button-icon">↻</span>Refresh data</button>
      </div>

      {props.err && <p style={{ color: '#fca5a5' }} role="alert">{props.err}</p>}
    </div>
  )
}
