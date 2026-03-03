import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function SchedulePage({ token, athleteId }: { token: string; athleteId: string }) {
  const [templates, setTemplates] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setErr(null)
    try {
      const [t, s] = await Promise.all([api.listTemplates(token), api.listScheduled(token, athleteId)])
      setTemplates(t); setItems(s)
      if (!templateId && t[0]) setTemplateId(t[0].id)
    } catch (e: any) { setErr(e.message) }
  }

  useEffect(() => { void load() }, [])

  async function create() {
    await api.createScheduled(token, { athlete_id: athleteId, template_id: templateId, date })
    setDate('')
    await load()
  }

  return (
    <>
      <div className="card">
        <h2>Schedule</h2>
        <div className="row">
          <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => void create()} disabled={!templateId || !date}>Add</button>
        </div>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      <div className="card">
        <h3>Entries</h3>
        <ul>
          {items.map(it => (
            <li key={it.id} style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{it.date} · template {it.template_id} · {it.status}</span>
                <div className="row">
                  <button onClick={async () => {
                    const to = prompt('Move to date (YYYY-MM-DD):')
                    if (!to) return
                    await api.moveScheduled(token, it.id, to)
                    await load()
                  }}>Move</button>
                  <button onClick={async () => {
                    const to = prompt('Copy to date (YYYY-MM-DD):')
                    if (!to) return
                    await api.copyScheduled(token, it.id, to)
                    await load()
                  }}>Copy</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
