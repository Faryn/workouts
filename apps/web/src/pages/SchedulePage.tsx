import { useEffect, useMemo, useState } from 'react'
import { api, type CalendarItem, type ScheduledWorkout, type Template } from '../lib/api'
import { errorMessage } from '../lib/errors'

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function SchedulePage({ token, athleteId }: { token: string; athleteId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [items, setItems] = useState<ScheduledWorkout[]>([])
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const templateNameById = useMemo(() => {
    const m: Record<string, string> = {}
    templates.forEach(t => { m[t.id] = t.name })
    return m
  }, [templates])

  const selected = useMemo(() => items.find(x => x.id === selectedId) ?? null, [items, selectedId])

  const monthRange = useMemo(() => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: iso(from), to: iso(to) }
  }, [])

  async function load() {
    setErr(null)
    try {
      const [t, s, c] = await Promise.all([
        api.listTemplates(token),
        api.listScheduled(token, athleteId),
        api.listCalendar(token, athleteId, monthRange.from, monthRange.to),
      ])
      setTemplates(t)
      setItems(s)
      setCalendarItems(c)
      if (!templateId && t[0]) setTemplateId(t[0].id)
      if (!selectedId && s[0]) setSelectedId(s[0].id)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => { void load() }, [athleteId])

  async function create() {
    await api.createScheduled(token, { athlete_id: athleteId, template_id: templateId, date })
    setDate('')
    await load()
  }

  async function moveSelected() {
    if (!selected) return
    const to = prompt('Move to date (YYYY-MM-DD):')
    if (!to) return
    await api.moveScheduled(token, selected.id, to)
    await load()
  }

  async function copySelected() {
    if (!selected) return
    const to = prompt('Copy to date (YYYY-MM-DD):')
    if (!to) return
    await api.copyScheduled(token, selected.id, to)
    await load()
  }

  async function skipSelected() {
    if (!selected) return
    await api.skipScheduled(token, selected.id)
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
        <h3>Calendar (this month)</h3>
        <ul>
          {calendarItems.map(item => (
            <li key={`${item.kind}-${item.id}`} style={{ marginBottom: 8 }}>
              {item.date} · {item.kind === 'strength' ? `🏋️ ${item.template_name} (${item.status})` : `🏃 ${item.type} (${item.duration_seconds}s)`}
              {item.kind === 'strength' && item.status === 'planned' && (
                <>
                  <a href={`/sessions?scheduled_id=${item.id}`} style={{ marginLeft: 8 }}>Start</a>
                  <button style={{ marginLeft: 8 }} onClick={() => setSelectedId(item.id)}>Details</button>
                </>
              )}
            </li>
          ))}
          {calendarItems.length === 0 && <li className="small">No calendar entries for this month.</li>}
        </ul>
      </div>

      <div className="card">
        <h3>Scheduled Entries</h3>
        <ul>
          {items.map(it => (
            <li key={it.id} style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{it.date} · {templateNameById[it.template_id] ?? it.template_id} · {it.status}</span>
                <div className="row">
                  <button onClick={() => setSelectedId(it.id)}>Details</button>
                  {it.status === 'planned' && <a href={`/sessions?scheduled_id=${it.id}`}>Start</a>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="card">
          <h3>Entry Details</h3>
          <p><strong>Date:</strong> {selected.date}</p>
          <p><strong>Template:</strong> {templateNameById[selected.template_id] ?? selected.template_id}</p>
          <p><strong>Status:</strong> {selected.status}</p>
          <div className="row">
            {selected.status === 'planned' && <a href={`/sessions?scheduled_id=${selected.id}`}>Start workout</a>}
            <button onClick={() => void moveSelected()}>Move</button>
            <button onClick={() => void copySelected()}>Copy</button>
            {selected.status === 'planned' && <button onClick={() => void skipSelected()}>Mark skipped</button>}
          </div>
        </div>
      )}
    </>
  )
}
