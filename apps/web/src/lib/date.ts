export function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

export function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}

export function weekStartMonday(d: Date) {
  const out = new Date(d)
  const day = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - day)
  return out
}
