import type { Template } from '../../lib/api'

export function ScheduleAdvancedPanel(props: {
  templateId: string
  patternType: 'interval_days' | 'weekday'
  setPatternType: (value: 'interval_days' | 'weekday') => void
  patternStart: string
  setPatternStart: (v: string) => void
  patternEnd: string
  setPatternEnd: (v: string) => void
  intervalDays: number
  setIntervalDays: (v: number) => void
  weekday: string
  setWeekday: (v: string) => void
  onApplyPattern: () => void
  bulkFrom: string
  setBulkFrom: (v: string) => void
  bulkTo: string
  setBulkTo: (v: string) => void
  shiftDays: number
  setShiftDays: (v: number) => void
  onBulkShift: () => void
  bulkTemplateId: string
  setBulkTemplateId: (v: string) => void
  onBulkReplace: () => void
  onBulkSkip: () => void
  templates: Template[]
  rangedCount: number
}) {
  const p = props
  return (
    <details className="advanced-panel" style={{ marginTop: 12 }}>
      <summary>⚙ Advanced</summary>
      <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
        <strong>Pattern</strong>
        <select value={p.patternType} onChange={e => p.setPatternType(e.target.value as 'interval_days' | 'weekday')}>
          <option value="interval_days">Every N days</option>
          <option value="weekday">Every weekday</option>
        </select>
        <input type="date" value={p.patternStart} onChange={e => p.setPatternStart(e.target.value)} />
        <input type="date" value={p.patternEnd} onChange={e => p.setPatternEnd(e.target.value)} />
        {p.patternType === 'interval_days' ? (
          <input type="number" min={1} value={p.intervalDays} onChange={e => p.setIntervalDays(Number(e.target.value || 1))} style={{ width: 110 }} />
        ) : (
          <select value={p.weekday} onChange={e => p.setWeekday(e.target.value)}>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        )}
        <button onClick={p.onApplyPattern} disabled={!p.templateId || !p.patternStart || !p.patternEnd}>Apply</button>
      </div>

      <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
        <strong>Bulk</strong>
        <input type="date" value={p.bulkFrom} onChange={e => p.setBulkFrom(e.target.value)} />
        <input type="date" value={p.bulkTo} onChange={e => p.setBulkTo(e.target.value)} />
        <input type="number" value={p.shiftDays} onChange={e => p.setShiftDays(Number(e.target.value || 0))} style={{ width: 90 }} />
        <button onClick={p.onBulkShift} disabled={!p.bulkFrom || !p.bulkTo}>Shift</button>
        <select value={p.bulkTemplateId} onChange={e => p.setBulkTemplateId(e.target.value)}>
          <option value="">Replace template…</option>
          {p.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={p.onBulkReplace} disabled={!p.bulkFrom || !p.bulkTo || !p.bulkTemplateId}>Replace</button>
        <button onClick={p.onBulkSkip} disabled={!p.bulkFrom || !p.bulkTo}>Skip</button>
        <span className="small">in range: {p.rangedCount}</span>
      </div>
    </details>
  )
}
