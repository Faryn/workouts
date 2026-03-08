import { useEffect, useMemo, useState } from 'react'
import { api, type CalendarItem, type SessionDetail, type ScheduledWorkout, type Template } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { ScheduleAdvancedPanel } from '../components/schedule/ScheduleAdvancedPanel'
import { ScheduleDayDetails } from '../components/schedule/ScheduleDayDetails'
import { ScheduleWeekGrid } from '../components/schedule/ScheduleWeekGrid'
import { addDays, addMonths, iso, weekStartMonday } from '../lib/date'

function badgeClass(item: CalendarItem) {
  if (item.kind === 'cardio') return 'status-badge status-in_progress'
  switch (item.status) {
    case 'completed': return 'status-badge status-completed'
    case 'skipped': return 'status-badge status-skipped'
    default: return 'status-badge status-planned'
  }
}

function relativeDateLabel(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`
  if (diffDays >= 7 && diffDays < 14) return 'Next week'
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DashboardPage({ me, token, athleteId }: { me: { id: string; email: string; role: string }; token: string; athleteId: string }) {
  const [err, setErr] = useState<string | null>(null)
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [inProgress, setInProgress] = useState<SessionDetail | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [items, setItems] = useState<ScheduledWorkout[]>([])
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState('')
  const [selectedDate, setSelectedDate] = useState(iso(new Date()))
  const [patternType, setPatternType] = useState<'interval_days' | 'weekday'>('interval_days')
  const [patternStart, setPatternStart] = useState('')
  const [patternEnd, setPatternEnd] = useState('')
  const [intervalDays, setIntervalDays] = useState(2)
  const [weekday, setWeekday] = useState('tuesday')
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const [bulkTemplateId, setBulkTemplateId] = useState('')
  const [shiftDays, setShiftDays] = useState(7)
  const [baseMonth, setBaseMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const range = useMemo(() => {
    const from = addMonths(baseMonth, -2)
    const to = addMonths(baseMonth, 4)
    return { from: iso(from), to: iso(new Date(to.getFullYear(), to.getMonth() + 1, 0)) }
  }, [baseMonth])

  const templateById = useMemo(() => Object.fromEntries(templates.map(t => [t.id, t])), [templates])
  const templateNameById = useMemo(() => Object.fromEntries(templates.map(t => [t.id, t.name])), [templates])
  const exerciseNameById = useMemo(() => {
    const map: Record<string, string> = {}
    templates.forEach(t => t.exercises.forEach(ex => {
      map[ex.exercise_id] = ex.exercise_name ?? map[ex.exercise_id] ?? ex.exercise_id
    }))
    return map
  }, [templates])

  const visibleWeeks = useMemo(() => {
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
  }, [baseMonth])

  async function load() {
    setErr(null)
    try {
      const [calendar, latest, templatesList, scheduled] = await Promise.all([
        api.listCalendar(token, athleteId, range.from, range.to),
        me.role === 'athlete' ? api.latestInProgressSession(token, athleteId) : Promise.resolve(null),
        api.listTemplates(token, athleteId),
        api.listScheduled(token, athleteId),
      ])
      setCalendarItems(calendar)
      setInProgress(latest)
      setTemplates(templatesList)
      setItems(scheduled)
      if (!templateId && templatesList[0]) setTemplateId(templatesList[0].id)
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => {
    void load()
  }, [token, athleteId, me.role, range.from, range.to])

  async function run(task: () => Promise<void>) {
    setErr(null)
    try {
      await task()
      await load()
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  function hasEvents(dateStr: string) {
    return calendarItems.some(x => x.date === dateStr)
  }

  function dayStatusClass(dateStr: string) {
    const day = calendarItems.filter(x => x.date === dateStr)
    if (day.some(x => x.kind === 'strength' && x.status === 'completed')) return '#34d399'
    if (day.some(x => x.kind === 'strength' && x.status === 'planned')) return '#60a5fa'
    if (day.some(x => x.kind === 'strength' && x.status === 'skipped')) return '#f59e0b'
    if (day.some(x => x.kind === 'cardio')) return '#a78bfa'
    return '#374151'
  }

  const today = iso(new Date())
  const todaysPlanned = calendarItems.find(i => i.kind === 'strength' && i.status === 'planned' && i.date === today)
  const upcomingStrength = calendarItems.filter(i => i.kind === 'strength').slice(0, 5)
  const completedCount = calendarItems.filter(i => i.kind === 'strength' && i.status === 'completed').length
  const plannedCount = calendarItems.filter(i => i.kind === 'strength' && i.status === 'planned').length
  const selectedStrength = items.filter(i => i.date === selectedDate).sort((a, b) => a.date.localeCompare(b.date))
  const selectedCardio = calendarItems.filter((i): i is Extract<CalendarItem, { kind: 'cardio' }> => i.kind === 'cardio' && i.date === selectedDate)

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <div className="hero-kicker">Dashboard</div>
          <h1 className="hero-title">Keep training on track.</h1>
          <p className="hero-text">See what is scheduled, jump into training, and manage your upcoming weeks from one place.</p>
        </div>
        <div className="hero-actions">
          {me.role === 'athlete' && inProgress && (
            <a href="/sessions"><button className="primary"><span className="button-icon">▶</span>Resume workout</button></a>
          )}
          {me.role === 'athlete' && !inProgress && todaysPlanned && (
            <a href={`/sessions?scheduled_id=${todaysPlanned.id}`}><button className="primary"><span className="button-icon">▶</span>Start workout</button></a>
          )}
          <button onClick={() => void run(async () => { await api.exportSessionsCsv(token, athleteId) })}><span className="button-icon">⤓</span>Export sessions</button>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="grid-2">
            <div className="metric-card"><div className="small">Planned</div><div className="metric-value">{plannedCount}</div><div className="small">in the visible range</div></div>
            <div className="metric-card"><div className="small">Completed</div><div className="metric-value">{completedCount}</div><div className="small">in the visible range</div></div>
          </div>

          <div className="card section-card">
            <div className="section-head">
              <div>
                <div className="section-kicker">Upcoming</div>
                <h3>What’s coming up</h3>
              </div>
            </div>
            <div className="stack">
              {upcomingStrength.map(item => (
                <div key={item.id} className="history-card">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="small">{relativeDateLabel(item.date)}</div>
                      <strong>{item.template_name}</strong>
                    </div>
                    <div className="row" style={{ alignItems: 'center' }}>
                      <span className={badgeClass(item)}>{item.status}</span>
                      {me.role === 'athlete' && item.status === 'planned' && <a className="button-link" href={`/sessions?scheduled_id=${item.id}`}><span className="button-icon">▶</span>Start workout</a>}
                    </div>
                  </div>
                </div>
              ))}
              {upcomingStrength.length === 0 && <div className="small">No workouts planned right now.</div>}
            </div>
          </div>

          <ScheduleWeekGrid
            baseMonth={baseMonth}
            setBaseMonth={setBaseMonth}
            visibleWeeks={visibleWeeks}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            hasEvents={hasEvents}
            dayStatusClass={dayStatusClass}
          />

          <ScheduleDayDetails
            selectedDate={selectedDate}
            selectedStrength={selectedStrength}
            selectedCardio={selectedCardio}
            templateById={templateById}
            templateNameById={templateNameById}
            exerciseNameById={exerciseNameById}
            onMove={(id, toDate) => void run(async () => { await api.moveScheduled(token, id, toDate) })}
            onCopy={(id, toDate) => void run(async () => { await api.copyScheduled(token, id, toDate) })}
            onSkip={(id) => void run(async () => { await api.skipScheduled(token, id) })}
            onDelete={(id) => void run(async () => { await api.deleteScheduled(token, id) })}
          />
        </div>

        <aside className="dashboard-side stack">
          <div className="card section-card">
            <div className="section-head"><div><div className="section-kicker">Schedule</div><h3>Quick add</h3></div></div>
            <div className="stack">
              <label className="stack"><span className="small">Program</span><select value={templateId} onChange={e => setTemplateId(e.target.value)}>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="stack"><span className="small">Date</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
              <button className="primary" onClick={() => void run(async () => { await api.createScheduled(token, { athlete_id: athleteId, template_id: templateId, date }) })} disabled={!templateId || !date}><span className="button-icon">＋</span>Schedule workout</button>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head"><div><div className="section-kicker">Automation</div><h3>Scheduling tools</h3></div></div>
            <ScheduleAdvancedPanel
              templateId={templateId}
              patternType={patternType}
              setPatternType={setPatternType}
              patternStart={patternStart}
              setPatternStart={setPatternStart}
              patternEnd={patternEnd}
              setPatternEnd={setPatternEnd}
              intervalDays={intervalDays}
              setIntervalDays={setIntervalDays}
              weekday={weekday}
              setWeekday={setWeekday}
              onApplyPattern={() => void run(async () => {
                await api.createScheduledPattern(token, {
                  athlete_id: athleteId,
                  template_id: templateId,
                  start_date: patternStart,
                  end_date: patternEnd,
                  pattern_type: patternType,
                  interval_days: patternType === 'interval_days' ? intervalDays : undefined,
                  weekday: patternType === 'weekday' ? weekday : undefined,
                })
              })}
              bulkFrom={bulkFrom}
              setBulkFrom={setBulkFrom}
              bulkTo={bulkTo}
              setBulkTo={setBulkTo}
              shiftDays={shiftDays}
              setShiftDays={setShiftDays}
              onBulkShift={() => void run(async () => {
                for (const it of items.filter(i => i.status === 'planned' && i.date >= bulkFrom && i.date <= bulkTo)) {
                  await api.moveScheduled(token, it.id, addDays(it.date, shiftDays))
                }
              })}
              bulkTemplateId={bulkTemplateId}
              setBulkTemplateId={setBulkTemplateId}
              onBulkReplace={() => void run(async () => {
                for (const it of items.filter(i => i.status === 'planned' && i.date >= bulkFrom && i.date <= bulkTo)) {
                  await api.createScheduled(token, { athlete_id: athleteId, template_id: bulkTemplateId, date: it.date })
                  await api.skipScheduled(token, it.id)
                }
              })}
              onBulkSkip={() => void run(async () => {
                for (const it of items.filter(i => i.status === 'planned' && i.date >= bulkFrom && i.date <= bulkTo)) {
                  await api.skipScheduled(token, it.id)
                }
              })}
              templates={templates}
              rangedCount={items.filter(i => i.status === 'planned' && i.date >= bulkFrom && i.date <= bulkTo).length}
            />
          </div>
        </aside>
      </div>

      {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
    </div>
  )
}
