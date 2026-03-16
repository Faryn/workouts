import type { CalendarItem, ExerciseOption, ScheduledWorkout, Template } from '../api'
import { addMonths, iso, weekStartMonday } from '../date'

export function buildTemplateById(templates: Template[]) {
  const map: Record<string, Template> = {}
  templates.forEach(template => {
    map[template.id] = template
  })
  return map
}

export function buildTemplateNameById(templates: Template[]) {
  const map: Record<string, string> = {}
  templates.forEach(template => {
    map[template.id] = template.name
  })
  return map
}

export function buildExerciseNameById(exercises: ExerciseOption[]) {
  const map: Record<string, string> = {}
  exercises.forEach(exercise => {
    map[exercise.id] = exercise.name
  })
  return map
}

export function buildScheduleRange(baseMonth: Date) {
  const from = addMonths(baseMonth, -2)
  const to = addMonths(baseMonth, 4)
  return {
    from: iso(from),
    to: iso(new Date(to.getFullYear(), to.getMonth() + 1, 0)),
  }
}

export function buildVisibleWeeks(baseMonth: Date) {
  const start = weekStartMonday(new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1))
  return Array.from({ length: 4 }, (_, weekIndex) => {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + weekIndex * 7)
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + dayIndex)
      return day
    })
  })
}

export function getRangedPlannedItems(items: ScheduledWorkout[], bulkFrom: string, bulkTo: string) {
  if (!bulkFrom || !bulkTo) return []
  return items.filter(item => item.status === 'planned' && item.date >= bulkFrom && item.date <= bulkTo)
}

export function getSelectedStrength(items: ScheduledWorkout[], selectedDate: string) {
  return items
    .filter(item => item.date === selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getSelectedCardio(calendarItems: CalendarItem[], selectedDate: string) {
  return calendarItems.filter(
    (item): item is Extract<CalendarItem, { kind: 'cardio' }> => item.kind === 'cardio' && item.date === selectedDate,
  )
}
