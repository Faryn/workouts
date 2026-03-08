type TemplateLite = { id: string; name: string }
type ScheduledLite = { id: string; date: string; template_id: string; status: string }

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
  return (
    <div className="card">
      <h2>Gym</h2>
      {props.hasActiveSession && (
        <div className="notice-banner" style={{ marginBottom: 10 }} role="status" aria-live="polite">
          <div>
            <strong>Resume in-progress workout</strong>
            <div className="small">You already have a live session. Resume that instead of starting a duplicate.</div>
          </div>
          <button className="primary" onClick={props.onResume}>Resume session</button>
        </div>
      )}
      <div className="row">
        <label className="stack" style={{ flex: 1 }}>
          <span className="small">Template</span>
          <select aria-label="Select template" value={props.templateId} onChange={e => props.onTemplateId(e.target.value)}>
            <option value="">Select template</option>
            {props.templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={props.onStartFromTemplate} disabled={!props.templateId || props.hasActiveSession}>
          Start from template
        </button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label className="stack" style={{ flex: 1 }}>
          <span className="small">Planned workout</span>
          <select aria-label="Select planned workout" value={props.scheduledId} onChange={e => props.onScheduledId(e.target.value)}>
            <option value="">Today / planned</option>
            {props.scheduledItems.map(s => (
              <option key={s.id} value={s.id}>
                {s.date} · {props.templateNameById[s.template_id] ?? s.template_id}
              </option>
            ))}
          </select>
        </label>
        <button onClick={props.onStartFromScheduled} disabled={!props.scheduledId || props.hasActiveSession}>
          Start planned workout
        </button>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="small">Autosave on</span>
        <button className="ghost" onClick={props.onClearDraft}>Clear draft</button>
        <button className="ghost" onClick={props.onResume}>Refresh / resume</button>
      </div>

      {props.err && <p style={{ color: '#fca5a5' }} role="alert">{props.err}</p>}
    </div>
  )
}
