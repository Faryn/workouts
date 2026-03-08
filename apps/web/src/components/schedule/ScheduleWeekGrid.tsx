import { addMonths, iso, monthLabel } from '../../lib/date'

export function ScheduleWeekGrid(props: {
  baseMonth: Date
  setBaseMonth: (d: Date) => void
  visibleWeeks: Date[][]
  selectedDate: string
  setSelectedDate: (d: string) => void
  hasEvents: (dateStr: string) => boolean
  dayStatusClass: (dateStr: string) => string
}) {
  const today = iso(new Date())
  return (
    <div className="card">
      <h3>Calendar</h3>
      <div className="schedule-calendar-toolbar">
        <div className="schedule-calendar-toolbar-main">
          <button onClick={() => props.setBaseMonth(addMonths(props.baseMonth, -1))}>← Month</button>
          <strong className="schedule-calendar-month-label">{monthLabel(props.baseMonth)}</strong>
          <button onClick={() => props.setBaseMonth(addMonths(props.baseMonth, 1))}>Month →</button>
        </div>
        <button className="ghost" onClick={() => {
          const now = new Date()
          props.setBaseMonth(new Date(now.getFullYear(), now.getMonth(), 1))
          props.setSelectedDate(today)
        }}>Today</button>
      </div>

      <div className="small schedule-calendar-weekdays">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>

      <div className="schedule-calendar-grid">
        {props.visibleWeeks.flat().map((d) => {
          const ds = iso(d)
          const isToday = ds === today
          const isSelected = props.selectedDate === ds
          return (
            <button
              key={ds}
              onClick={() => props.setSelectedDate(ds)}
              className={`schedule-calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
              style={{ borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-2)' : props.dayStatusClass(ds) }}
            >
              <div className="schedule-calendar-day-number" style={{ fontWeight: isSelected ? 700 : 600 }}>{d.getDate()}</div>
              {props.hasEvents(ds) && (
                <span
                  className="schedule-calendar-day-dot"
                  style={{ background: props.dayStatusClass(ds) }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
