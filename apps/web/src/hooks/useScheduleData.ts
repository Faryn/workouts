import { useEffect, useMemo, useState } from 'react'

import { api, type CalendarItem, type ExerciseOption, type ScheduledWorkout, type Template } from '../lib/api'
import { addDays, addMonths, iso, weekStartMonday } from '../lib/date'
import { errorMessage } from '../lib/errors'

export function useScheduleData(params: { token: string; athleteId: string }) {
  const { token, athleteId } = params

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
      const [t, ex, s, c] = await Promise.all([
        api.listTemplates(token, athleteId),
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

  const selectedStrength = items
    .filter(i => i.date === selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const selectedCardio = calendarItems.filter(
    (i): i is Extract<CalendarItem, { kind: 'cardio' }> => i.kind === 'cardio' && i.date === selectedDate,
  )

  return {
    templates,
    exercises,
    items,
    calendarItems,
    templateId,
    setTemplateId,
    date,
    setDate,
    patternType,
    setPatternType,
    patternStart,
    setPatternStart,
    patternEnd,
    setPatternEnd,
    intervalDays,
    setIntervalDays,
    weekday,
    setWeekday,
    selectedDate,
    setSelectedDate,
    err,
    bulkFrom,
    setBulkFrom,
    bulkTo,
    setBulkTo,
    bulkTemplateId,
    setBulkTemplateId,
    shiftDays,
    setShiftDays,
    baseMonth,
    setBaseMonth,
    templateById,
    templateNameById,
    exerciseNameById,
    visibleWeeks,
    selectedStrength,
    selectedCardio,
    rangedPlannedItems,
    create,
    createPattern,
    moveById,
    copyById,
    skipById,
    deleteById,
    bulkShift,
    bulkReplaceTemplate,
    bulkSkipRange,
  }
}
