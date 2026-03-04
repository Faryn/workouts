import { useEffect, useMemo, useState } from 'react'
import { api, type CalendarItem, type ExerciseOption, type ScheduledWorkout, type Template } from '../lib/api'
import { errorMessage } from '../lib/errors'

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export function SchedulePage({ token, athleteId }: { token: string; athleteId: string }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [items, setItems] = useState<ScheduledWorkout[]>([])
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState('')

  const [patternType, setPatternType] = useState<'interval_days' | 'weekday'>('interval_days')
  const [patternStart, setPatternStart] = useState('')
  const [patternEnd, setPatternEnd] = useState('')
  const [intervalDays, setIntervalDays] = useState(2)
  const [weekday, setWeekday] = useState('tuesday')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [baseMonth, setBaseMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const templateById = useMemo(() => {
    const m: Record<string, Template> = {}
    templates.forEach(t => { m[t.id] = t })
    return m
  }, [templates])

  const templateNameById = useMemo(() => {
    const m: Record<string, string> = {}
    templates.forEach(t => { m[t.id] = t.name })
    return m
  }, [templates])

  const exerciseNameById = useMemo(() => {
    const m: Record<string, string> = {}
    exercises.forEach(e => { m[e.id] = e.name })
    return m
  }, [exercises])

  const selected = useMemo(() => items.find(x => x.id === selectedId) ?? null, [items, selectedId])

  const range = useMemo(() => {
    const from = addMonths(baseMonth, -2)
    const to = addMonths(baseMonth, 4)
    return { from: iso(from), to: iso(new Date(to.getFullYear(), to.getMonth() + 1, 0)) }
  }, [baseMonth])

  async function load() {
    setErr(null)
    try {
      const [t, ex, s, c] = await Promise.all([
        api.listTemplates(token),
        api.listExercises(token),
        api.listScheduled(token, athleteId),
        api.listCalendar(token, athleteId, range.from, range.to),
      ])
      setTemplates(t)
      setExercises(ex)
      setItems(s)
      setCalendarItems(c)
      if (!templateId && t[0]) setTemplateId(t[0].id)
      if (!selectedId && s[0]) setSelectedId(s[0].id)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => { void load() }, [athleteId, range.from, range.to])

  async function create() {
    await api.createScheduled(token, { athlete_id: athleteId, template_id: templateId, date })
    setDate('')
    await load()
  }

  async function createPattern() {
    if (!patternStart || !patternEnd || !templateId) return
    await api.createScheduledPattern(token, {
      athlete_id: athleteId,
      template_id: templateId,
      start_date: patternStart,
      end_date: patternEnd,
      pattern_type: patternType,
      interval_days: patternType === 'interval_days' ? intervalDays : undefined,
      weekday: patternType === 'weekday' ? weekday : undefined,
    })
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

  const dayItems = selectedDate ? calendarItems.filter(x => x.date === selectedDate) : []

  const months = [addMonths(baseMonth, -1), baseMonth, addMonths(baseMonth, 1), addMonths(baseMonth, 2)]

  function dayStatusClass(dateStr: string) {
    const day = calendarItems.filter(x => x.date === dateStr)
    if (day.some(x => x.kind === 'strength' && x.status === 'completed')) return '#34d399'
    if (day.some(x => x.kind === 'strength' && x.status === 'planned')) return '#60a5fa'
    if (day.some(x => x.kind === 'strength' && x.status === 'skipped')) return '#f59e0b'
    if (day.some(x => x.kind === 'cardio')) return '#a78bfa'
    return '#374151'
  }

  function hasEvents(dateStr: string) {
    return calendarItems.some(x => x.date === dateStr)
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
          <button onClick={() => void create()} disabled={!templateId || !date}>Add once</button>
        </div>

        <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
          <strong>Pattern schedule</strong>
          <select value={patternType} onChange={e => setPatternType(e.target.value as 'interval_days' | 'weekday')}>
            <option value="interval_days">Every N days</option>
            <option value="weekday">Every weekday</option>
          </select>
          <input type="date" value={patternStart} onChange={e => setPatternStart(e.target.value)} />
          <input type="date" value={patternEnd} onChange={e => setPatternEnd(e.target.value)} />
          {patternType === 'interval_days' ? (
            <input type="number" min={1} value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value || 1))} style={{ width: 110 }} />
          ) : (
            <select value={weekday} onChange={e => setWeekday(e.target.value)}>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          )}
          <button onClick={() => void createPattern()} disabled={!templateId || !patternStart || !patternEnd}>Apply pattern</button>
        </div>

        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      <div className="card">
        <h3>Scrollable Calendar View</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <button onClick={() => setBaseMonth(addMonths(baseMonth, -1))}>← Prev</button>
          <strong style={{ paddingTop: 10 }}>{monthLabel(baseMonth)}</strong>
          <button onClick={() => setBaseMonth(addMonths(baseMonth, 1))}>Next →</button>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #374151', borderRadius: 8, padding: 8 }}>
          {months.map(m => {
            const start = new Date(m.getFullYear(), m.getMonth(), 1)
            const end = new Date(m.getFullYear(), m.getMonth() + 1, 0)
            const leadingBlanks = (start.getDay() + 6) % 7 // Monday-first
            const cells: Array<Date | null> = [
              ...Array.from({ length: leadingBlanks }, () => null),
              ...Array.from({ length: end.getDate() }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1)),
            ]
            while (cells.length % 7 !== 0) cells.push(null)

            const weeks: Array<Array<Date | null>> = []
            for (let i = 0; i < cells.length; i += 7) {
              weeks.push(cells.slice(i, i + 7))
            }

            return (
              <div key={`${m.getFullYear()}-${m.getMonth()}`} style={{ marginBottom: 12 }}>
                <h4>{monthLabel(m)}</h4>
                <div className="small" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {weeks.map((week, widx) => (
                    <div key={widx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                      {week.map((d, didx) => {
                        if (!d) return <div key={didx} style={{ minHeight: 40 }} />
                        const ds = iso(d)
                        return (
                          <button
                            key={ds}
                            onClick={() => setSelectedDate(ds)}
                            style={{
                              minHeight: 40,
                              padding: 6,
                              borderRadius: 8,
                              border: selectedDate === ds ? '2px solid #93c5fd' : `1px solid ${dayStatusClass(ds)}`,
                              position: 'relative',
                            }}
                          >
                            {d.getDate()}
                            {hasEvents(ds) && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 4,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: dayStatusClass(ds),
                                  display: 'inline-block',
                                }}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {selectedDate && (
          <div style={{ marginTop: 12 }}>
            <h4>{selectedDate} — day details</h4>
            <ul>
              {dayItems.map(item => (
                <li key={`${item.kind}-${item.id}`}>
                  {item.kind === 'strength' ? `🏋️ ${item.template_name} (${item.status})` : `🏃 ${item.type} (${item.duration_seconds}s)`}
                </li>
              ))}
              {dayItems.length === 0 && <li className="small">Nothing planned/completed on this day.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Scheduled Entries</h3>
        <ul>
          {items.map(it => {
            const tpl = templateById[it.template_id]
            return (
              <li key={it.id} style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{it.date} · {templateNameById[it.template_id] ?? it.template_id} · {it.status}</span>
                  <div className="row">
                    <button onClick={() => setSelectedId(it.id)}>Details</button>
                    {it.status === 'planned' && <a href={`/sessions?scheduled_id=${it.id}`}>Start</a>}
                  </div>
                </div>
                {tpl && (
                  <details>
                    <summary className="small" style={{ cursor: 'pointer' }}>Show exercises</summary>
                    <ul style={{ marginTop: 6 }}>
                      {tpl.exercises
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(ex => (
                          <li key={ex.id} className="small" style={{ marginBottom: 4 }}>
                            {exerciseNameById[ex.exercise_id] ?? ex.exercise_id} · {ex.planned_sets} × {ex.planned_reps}
                            {ex.planned_weight != null ? ` · ${ex.planned_weight} kg` : ''}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {selected && (
        <div className="card">
          <h3>Entry Details</h3>
          <p><strong>Date:</strong> {selected.date}</p>
          <p><strong>Template:</strong> {templateNameById[selected.template_id] ?? selected.template_id}</p>
          <p><strong>Status:</strong> {selected.status}</p>

          {templateById[selected.template_id] && (
            <>
              <h4>Contained exercises</h4>
              <ul>
                {templateById[selected.template_id].exercises
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map(ex => (
                    <li key={ex.id} className="small" style={{ marginBottom: 4 }}>
                      {exerciseNameById[ex.exercise_id] ?? ex.exercise_id} · {ex.planned_sets} × {ex.planned_reps}
                      {ex.planned_weight != null ? ` · ${ex.planned_weight} kg` : ''}
                      {ex.rest_seconds != null ? ` · rest ${ex.rest_seconds}s` : ''}
                    </li>
                  ))}
              </ul>
            </>
          )}

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
