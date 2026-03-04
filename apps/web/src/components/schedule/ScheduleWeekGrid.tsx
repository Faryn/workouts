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
      <h3>Week view</h3>
      <div className="row" style={{ marginBottom: 10 }}>
        <button onClick={() => props.setBaseMonth(addMonths(props.baseMonth, -1))}>← Month</button>
        <strong style={{ paddingTop: 10 }}>{monthLabel(props.baseMonth)}</strong>
        <button onClick={() => props.setBaseMonth(addMonths(props.baseMonth, 1))}>Month →</button>
      </div>

      <div className="small" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>

      {props.visibleWeeks.map((week, widx) => (
        <div key={widx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
          {week.map((d) => {
            const ds = iso(d)
            const isToday = ds === today
            return (
              <button
                key={ds}
                onClick={() => props.setSelectedDate(ds)}
                style={{
                  minHeight: 64,
                  padding: 8,
                  borderRadius: 10,
                  border: props.selectedDate === ds
                    ? '2px solid var(--accent)'
                    : isToday
                      ? '2px solid var(--accent-2)'
                      : `1px solid ${props.dayStatusClass(ds)}`,
                  background: isToday ? 'rgba(59,130,246,0.12)' : undefined,
                  position: 'relative',
                  textAlign: 'left',
                }}
              >
                <div>{d.getDate()}</div>
                {props.hasEvents(ds) && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: props.dayStatusClass(ds),
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
  )
}
