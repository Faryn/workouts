import { ScheduleAdvancedPanel } from '../components/schedule/ScheduleAdvancedPanel'
import { ScheduleDayDetails } from '../components/schedule/ScheduleDayDetails'
import { ScheduleWeekGrid } from '../components/schedule/ScheduleWeekGrid'
import { useScheduleData } from '../hooks/useScheduleData'

export function SchedulePage({ token, athleteId }: { token: string; athleteId: string }) {
  const d = useScheduleData({ token, athleteId })

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

  return (
    <>
      <div className="card">
        <h2>Schedule</h2>
        <div className="row">
          <select value={d.templateId} onChange={e => d.setTemplateId(e.target.value)}>
            {d.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={d.date} onChange={e => d.setDate(e.target.value)} />
          <button onClick={() => void d.create()} disabled={!d.templateId || !d.date}>Add</button>
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
        onMove={(id, currentDate) => void d.moveById(id, currentDate)}
        onCopy={(id, currentDate) => void d.copyById(id, currentDate)}
        onSkip={(id) => void d.skipById(id)}
        onDelete={(id) => void d.deleteById(id)}
      />
    </>
  )
}
