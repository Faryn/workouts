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

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}

function weekStartMonday(d: Date) {
  const out = new Date(d)
  const day = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - day)
  return out
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

  const [selectedDate, setSelectedDate] = useState(iso(new Date()))
  const [err, setErr] = useState<string | null>(null)

  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const [bulkTemplateId, setBulkTemplateId] = useState('')
  const [shiftDays, setShiftDays] = useState(7)

  const [baseMonth, setBaseMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const filtersKey = `schedule-filters:${athleteId}`

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

  const range = useMemo(() => {
    const from = addMonths(baseMonth, -2)
    const to = addMonths(baseMonth, 4)
    return { from: iso(from), to: iso(new Date(to.getFullYear(), to.getMonth() + 1, 0)) }
  }, [baseMonth])

  const visibleWeeks = (() => {
    const start = weekStartMonday(new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1))
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + i * 7)
      return Array.from({ length: 7 }, (_, d) => {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + d)
        return day
      })
    })
  })()

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
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(filtersKey)
      if (!raw) return
      const f = JSON.parse(raw)
      if (f.bulkFrom) setBulkFrom(f.bulkFrom)
      if (f.bulkTo) setBulkTo(f.bulkTo)
      if (f.bulkTemplateId) setBulkTemplateId(f.bulkTemplateId)
      if (typeof f.shiftDays === 'number') setShiftDays(f.shiftDays)
    } catch {
      // ignore
    }
  }, [filtersKey])

  useEffect(() => {
    localStorage.setItem(filtersKey, JSON.stringify({ bulkFrom, bulkTo, bulkTemplateId, shiftDays }))
  }, [filtersKey, bulkFrom, bulkTo, bulkTemplateId, shiftDays])

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

  async function moveById(id: string, currentDate: string) {
    const to = prompt('Move to date (YYYY-MM-DD):', currentDate)
    if (!to) return
    await api.moveScheduled(token, id, to)
    await load()
  }

  async function copyById(id: string, currentDate: string) {
    const to = prompt('Copy to date (YYYY-MM-DD):', currentDate)
    if (!to) return
    await api.copyScheduled(token, id, to)
    await load()
  }

  async function skipById(id: string) {
    await api.skipScheduled(token, id)
    await load()
  }

  async function deleteById(id: string) {
    await api.deleteScheduled(token, id)
    await load()
  }

  function rangedPlannedItems() {
    if (!bulkFrom || !bulkTo) return []
    return items.filter(i => i.status === 'planned' && i.date >= bulkFrom && i.date <= bulkTo)
  }

  async function bulkShift() {
    const scope = rangedPlannedItems()
    for (const it of scope) {
      await api.moveScheduled(token, it.id, addDays(it.date, shiftDays))
    }
    await load()
  }

  async function bulkReplaceTemplate() {
    if (!bulkTemplateId) return
    const scope = rangedPlannedItems()
    for (const it of scope) {
      await api.createScheduled(token, {
        athlete_id: athleteId,
        template_id: bulkTemplateId,
        date: it.date,
      })
      await api.skipScheduled(token, it.id)
    }
    await load()
  }

  async function bulkSkipRange() {
    const scope = rangedPlannedItems()
    for (const it of scope) {
      await api.skipScheduled(token, it.id)
    }
    await load()
  }

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

  const selectedStrength = items
    .filter(i => i.date === selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const selectedCardio = calendarItems.filter(
    (i): i is Extract<CalendarItem, { kind: 'cardio' }> => i.kind === 'cardio' && i.date === selectedDate,
  )

  const today = iso(new Date())

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

        <details className="advanced-panel" style={{ marginTop: 12 }}>
          <summary>⚙ Advanced</summary>
          <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
            <strong>Pattern</strong>
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
            <button onClick={() => void createPattern()} disabled={!templateId || !patternStart || !patternEnd}>Apply</button>
          </div>

          <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
            <strong>Bulk</strong>
            <input type="date" value={bulkFrom} onChange={e => setBulkFrom(e.target.value)} />
            <input type="date" value={bulkTo} onChange={e => setBulkTo(e.target.value)} />
            <input type="number" value={shiftDays} onChange={e => setShiftDays(Number(e.target.value || 0))} style={{ width: 90 }} />
            <button onClick={() => void bulkShift()} disabled={!bulkFrom || !bulkTo}>Shift</button>
            <select value={bulkTemplateId} onChange={e => setBulkTemplateId(e.target.value)}>
              <option value="">Replace template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={() => void bulkReplaceTemplate()} disabled={!bulkFrom || !bulkTo || !bulkTemplateId}>Replace</button>
            <button onClick={() => void bulkSkipRange()} disabled={!bulkFrom || !bulkTo}>Skip</button>
            <span className="small">in range: {rangedPlannedItems().length}</span>
          </div>
        </details>

        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      <div className="card">
        <h3>Week view</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <button onClick={() => setBaseMonth(addMonths(baseMonth, -1))}>← Month</button>
          <strong style={{ paddingTop: 10 }}>{monthLabel(baseMonth)}</strong>
          <button onClick={() => setBaseMonth(addMonths(baseMonth, 1))}>Month →</button>
        </div>

        <div className="small" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>

        {visibleWeeks.map((week, widx) => (
          <div key={widx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {week.map((d) => {
              const ds = iso(d)
              const isToday = ds === today
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(ds)}
                  style={{
                    minHeight: 64,
                    padding: 8,
                    borderRadius: 10,
                    border: selectedDate === ds
                      ? '2px solid var(--accent)'
                      : isToday
                        ? '2px solid var(--accent-2)'
                        : `1px solid ${dayStatusClass(ds)}`,
                    background: isToday ? 'rgba(59,130,246,0.12)' : undefined,
                    position: 'relative',
                    textAlign: 'left',
                  }}
                >
                  <div>{d.getDate()}</div>
                  {hasEvents(ds) && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 8,
                        width: 8,
                        height: 8,
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

      <div className="card">
        <h3>{selectedDate}</h3>
        {selectedStrength.length === 0 && selectedCardio.length === 0 && <p className="small">No entries.</p>}

        {selectedStrength.map(it => {
          const tpl = templateById[it.template_id]
          return (
            <div key={it.id} className="card" style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{templateNameById[it.template_id] ?? it.template_id}</strong>
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
                          {exerciseNameById[ex.exercise_id] ?? ex.exercise_id} · {ex.planned_sets} × {ex.planned_reps}
                          {ex.planned_weight != null ? ` · ${ex.planned_weight} kg` : ''}
                          {ex.rest_seconds != null ? ` · rest ${ex.rest_seconds}s` : ''}
                        </li>
                      ))}
                  </ul>
                </details>
              )}

              <div className="row" style={{ marginTop: 8 }}>
                {it.status === 'planned' && <a className="button-link" href={`/sessions?scheduled_id=${it.id}`}>Start</a>}
                <button onClick={() => void moveById(it.id, it.date)}>Move</button>
                <button onClick={() => void copyById(it.id, it.date)}>Copy</button>
                {it.status === 'planned' && <button onClick={() => void skipById(it.id)}>Skip</button>}
                <button onClick={() => void deleteById(it.id)}>Delete</button>
              </div>
            </div>
          )
        })}

        {selectedCardio.map(item => (
          <div key={item.id} className="small" style={{ marginBottom: 8 }}>
            🏃 {item.type} ({item.duration_seconds}s)
          </div>
        ))}
      </div>
    </>
  )
}
