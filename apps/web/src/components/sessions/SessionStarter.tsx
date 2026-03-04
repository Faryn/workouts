type TemplateLite = { id: string; name: string }
type ScheduledLite = { id: string; date: string; template_id: string; status: string }

export function SessionStarter(props: {
  templates: TemplateLite[]
  scheduledItems: ScheduledLite[]
  templateId: string
  scheduledId: string
  templateNameById: Record<string, string>
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
      <div className="row">
        <select value={props.templateId} onChange={e => props.onTemplateId(e.target.value)}>
          <option value="">Select template</option>
          {props.templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button onClick={props.onStartFromTemplate} disabled={!props.templateId}>
          Start
        </button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <select value={props.scheduledId} onChange={e => props.onScheduledId(e.target.value)}>
          <option value="">Today / planned</option>
          {props.scheduledItems.map(s => (
            <option key={s.id} value={s.id}>
              {s.date} · {props.templateNameById[s.template_id] ?? s.template_id}
            </option>
          ))}
        </select>
        <button onClick={props.onStartFromScheduled} disabled={!props.scheduledId}>
          Go
        </button>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="small">Autosave on</span>
        <button onClick={props.onClearDraft}>Clear</button>
        <button onClick={props.onResume}>Resume</button>
      </div>

      {props.err && <p style={{ color: '#fca5a5' }}>{props.err}</p>}
    </div>
  )
}
