import { useMemo, useState } from 'react'
import { iso, weekStartMonday } from '../lib/date'
import { ScheduleAdvancedPanel } from '../components/schedule/ScheduleAdvancedPanel'
import { ScheduleDayDetails } from '../components/schedule/ScheduleDayDetails'
import { ScheduleWeekGrid } from '../components/schedule/ScheduleWeekGrid'
import { useScheduleData } from '../hooks/useScheduleData'

export function SchedulePage({ token, athleteId }: { token: string; athleteId: string }) {
  const d = useScheduleData({ token, athleteId })
  const [viewFilter, setViewFilter] = useState<'today' | 'planned' | 'completed' | 'skipped'>('today')

  function dayStatusClass(dateStr: string) {
    const day = d.calendarItems.filter(x => x.date === dateStr)
    if (day.some(x => x.kind === 'strength' && x.status === 'completed')) return '#34d399'
    if (day.some(x => x.kind === 'strength' && x.status === 'planned')) return '#60a5fa'
    if (day.some(x => x.kind === 'strength' && x.status === 'skipped')) return '#f59e0b'
    if (day.some(x => x.kind === 'cardio')) return '#a78bfa'
    return '#374151'
  }

  function hasEvents(dateStr: string) {
    return d.calendarItems.some(x => x.date === dateStr)
  }

  const today = iso(new Date())
  const weekStart = weekStartMonday(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const thisWeekStart = iso(weekStart)
  const thisWeekEnd = iso(weekEnd)

  const todayItems = d.calendarItems.filter(x => x.date === today)
  const thisWeekItems = d.calendarItems.filter(x => x.date >= thisWeekStart && x.date <= thisWeekEnd)
  const plannedCount = d.calendarItems.filter(x => x.kind === 'strength' && x.status === 'planned').length
  const completedCount = d.calendarItems.filter(x => x.kind === 'strength' && x.status === 'completed').length

  const filteredStrength = useMemo(() => {
    switch (viewFilter) {
      case 'planned':
        return d.items.filter(i => i.status === 'planned')
      case 'completed':
        return d.items.filter(i => i.status === 'completed')
      case 'skipped':
        return d.items.filter(i => i.status === 'skipped')
      default:
        return d.items.filter(i => i.date === today)
    }
  }, [d.items, today, viewFilter])

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Schedule</h2>
            <div className="small">Plan workouts, review the week, and jump straight into today.</div>
          </div>
          <div className="row">
            <button className="ghost" onClick={() => d.setSelectedDate(today)}>Today</button>
            <button className="ghost" onClick={() => d.setSelectedDate(thisWeekStart)}>This week</button>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="metric-card">
            <div className="small">Planned in visible range</div>
            <div className="metric-value">{plannedCount}</div>
          </div>
          <div className="metric-card">
            <div className="small">Completed in visible range</div>
            <div className="metric-value">{completedCount}</div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <select value={d.templateId} onChange={e => d.setTemplateId(e.target.value)}>
            {d.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={d.date} onChange={e => d.setDate(e.target.value)} />
          <button onClick={() => void d.create()} disabled={!d.templateId || !d.date}>Add workout</button>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="history-card">
            <div><strong>Today</strong></div>
            <div className="small">{todayItems.length ? `${todayItems.length} item(s)` : 'Nothing scheduled today'}</div>
          </div>
          <div className="history-card">
            <div><strong>This week</strong></div>
            <div className="small">{thisWeekItems.length} item(s) between {thisWeekStart} and {thisWeekEnd}</div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className={viewFilter === 'today' ? 'primary' : 'ghost'} onClick={() => setViewFilter('today')}>Today</button>
          <button className={viewFilter === 'planned' ? 'primary' : 'ghost'} onClick={() => setViewFilter('planned')}>Planned</button>
          <button className={viewFilter === 'completed' ? 'primary' : 'ghost'} onClick={() => setViewFilter('completed')}>Completed</button>
          <button className={viewFilter === 'skipped' ? 'primary' : 'ghost'} onClick={() => setViewFilter('skipped')}>Skipped</button>
        </div>

        <div className="stack" style={{ marginTop: 12 }}>
          {filteredStrength.slice(0, 5).map(item => (
            <div key={item.id} className="history-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.date}</strong> · {d.templateNameById[item.template_id] ?? item.template_id}
                </div>
                <span className={`status-badge status-${item.status === 'completed' ? 'completed' : item.status === 'skipped' ? 'skipped' : 'planned'}`}>{item.status}</span>
              </div>
            </div>
          ))}
          {filteredStrength.length === 0 && <div className="small">No workouts in this filter.</div>}
        </div>

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

        {d.err && <p style={{ color: '#fca5a5' }}>{d.err}</p>}
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
    </>
  )
}
