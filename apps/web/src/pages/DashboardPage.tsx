import { useEffect, useState } from 'react'

import { type CalendarItem, api, type SessionDetail } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { ScheduleAdvancedPanel } from '../components/schedule/ScheduleAdvancedPanel'
import { ScheduleDayDetails } from '../components/schedule/ScheduleDayDetails'
import { ScheduleWeekGrid } from '../components/schedule/ScheduleWeekGrid'
import { iso } from '../lib/date'
import { useScheduleData } from '../hooks/useScheduleData'

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

export function DashboardPage({ me, token, athleteId }: { me: { id: string; email: string; name?: string | null; role: string }; token: string; athleteId: string }) {
  const d = useScheduleData({ token, athleteId })
  const [exportErr, setExportErr] = useState<string | null>(null)
  const [inProgress, setInProgress] = useState<SessionDetail | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadLatest() {
      if (me.role !== 'athlete') {
        setInProgress(null)
        return
      }
      try {
        const latest = await api.latestInProgressSession(token, athleteId)
        if (!cancelled) setInProgress(latest ?? null)
      } catch {
        if (!cancelled) setInProgress(null)
      }
    }

    void loadLatest()
    return () => {
      cancelled = true
    }
  }, [token, athleteId, me.role])

  async function exportSessions() {
    setExportErr(null)
    try {
      await api.exportSessionsCsv(token, athleteId)
    } catch (e: unknown) {
      setExportErr(errorMessage(e))
    }
  }

  function hasEvents(dateStr: string) {
    return d.calendarItems.some(x => x.date === dateStr)
  }

  function dayStatusClass(dateStr: string) {
    const day = d.calendarItems.filter(x => x.date === dateStr)
    if (day.some(x => x.kind === 'strength' && x.status === 'completed')) return '#34d399'
    if (day.some(x => x.kind === 'strength' && x.status === 'planned')) return '#60a5fa'
    if (day.some(x => x.kind === 'strength' && x.status === 'skipped')) return '#f59e0b'
    if (day.some(x => x.kind === 'cardio')) return '#a78bfa'
    return '#374151'
  }

  const today = iso(new Date())
  const todaysPlanned = d.calendarItems.find(i => i.kind === 'strength' && i.status === 'planned' && i.date === today)
  const upcomingStrength = d.calendarItems
    .filter((i): i is Extract<CalendarItem, { kind: 'strength' }> => i.kind === 'strength' && i.date >= today)
    .slice(0, 5)
  const completedCount = d.calendarItems.filter(i => i.kind === 'strength' && i.status === 'completed').length
  const plannedCount = d.calendarItems.filter(i => i.kind === 'strength' && i.status === 'planned').length

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <div className="hero-kicker">Dashboard</div>
          <h1 className="hero-title">{me.role === 'athlete' && me.name ? `${me.name}, keep training on track.` : 'Keep training on track.'}</h1>
          <p className="hero-text">See what is scheduled, jump into training, and manage your upcoming weeks from one place.</p>
        </div>
        <div className="hero-actions">
          {me.role === 'athlete' && inProgress && (
            <a href="/sessions"><button className="primary"><span className="button-icon">▶</span>Resume workout</button></a>
          )}
          {me.role === 'athlete' && !inProgress && todaysPlanned && (
            <a href={`/sessions?scheduled_id=${todaysPlanned.id}`}><button className="primary"><span className="button-icon">▶</span>Start workout</button></a>
          )}
          <button onClick={() => void exportSessions()}><span className="button-icon">⤓</span>Export sessions</button>
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
            baseMonth={d.baseMonth}
            setBaseMonth={d.setBaseMonth}
            visibleWeeks={d.visibleWeeks}
            selectedDate={d.selectedDate}
            setSelectedDate={d.setSelectedDate}
            hasEvents={hasEvents}
            dayStatusClass={dayStatusClass}
          />

          <ScheduleDayDetails
            selectedDate={d.selectedDate}
            selectedStrength={d.selectedStrength}
            selectedCardio={d.selectedCardio}
            templateById={d.templateById}
            templateNameById={d.templateNameById}
            exerciseNameById={d.exerciseNameById}
            onMove={(id, toDate) => void d.moveById(id, toDate)}
            onCopy={(id, toDate) => void d.copyById(id, toDate)}
            onSkip={(id) => void d.skipById(id)}
            onDelete={(id) => void d.deleteById(id)}
          />
        </div>

        <aside className="dashboard-side stack">
          <div className="card section-card">
            <div className="section-head"><div><div className="section-kicker">Schedule</div><h3>Quick add</h3></div></div>
            <div className="stack">
              <label className="stack"><span className="small">Program</span><select value={d.templateId} onChange={e => d.setTemplateId(e.target.value)}>{d.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="stack"><span className="small">Date</span><input type="date" value={d.date} onChange={e => d.setDate(e.target.value)} /></label>
              <button className="primary" onClick={() => void d.create()} disabled={!d.templateId || !d.date}><span className="button-icon">＋</span>Schedule workout</button>
            </div>
          </div>

          <div className="card section-card">
            <div className="section-head"><div><div className="section-kicker">Automation</div><h3>Scheduling tools</h3></div></div>
            <ScheduleAdvancedPanel
              templateId={d.templateId}
              patternType={d.patternType}
              setPatternType={d.setPatternType}
              patternStart={d.patternStart}
              setPatternStart={d.setPatternStart}
              patternEnd={d.patternEnd}
              setPatternEnd={d.setPatternEnd}
              intervalDays={d.intervalDays}
              setIntervalDays={d.setIntervalDays}
              weekday={d.weekday}
              setWeekday={d.setWeekday}
              onApplyPattern={() => void d.createPattern()}
              bulkFrom={d.bulkFrom}
              setBulkFrom={d.setBulkFrom}
              bulkTo={d.bulkTo}
              setBulkTo={d.setBulkTo}
              shiftDays={d.shiftDays}
              setShiftDays={d.setShiftDays}
              onBulkShift={() => void d.bulkShift()}
              bulkTemplateId={d.bulkTemplateId}
              setBulkTemplateId={d.setBulkTemplateId}
              onBulkReplace={() => void d.bulkReplaceTemplate()}
              onBulkSkip={() => void d.bulkSkipRange()}
              templates={d.templates}
              rangedCount={d.rangedPlannedItems().length}
            />
          </div>
        </aside>
      </div>

      {(d.err || exportErr) && <p style={{ color: '#fca5a5' }}>{d.err ?? exportErr}</p>}
    </div>
  )
}
