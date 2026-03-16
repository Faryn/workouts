import { useEffect, useMemo, useState } from 'react'

import { api, type CalendarItem, type ExerciseOption, type ScheduledWorkout, type Template } from '../lib/api'
import { iso } from '../lib/date'
import { errorMessage } from '../lib/errors'
import {
  buildExerciseNameById,
  buildScheduleRange,
  buildTemplateById,
  buildTemplateNameById,
  buildVisibleWeeks,
  getRangedPlannedItems,
  getSelectedCardio,
  getSelectedStrength,
} from '../lib/schedule/selectors'

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

  const templateById = useMemo(() => buildTemplateById(templates), [templates])
  const templateNameById = useMemo(() => buildTemplateNameById(templates), [templates])
  const exerciseNameById = useMemo(() => buildExerciseNameById(exercises), [exercises])
  const range = useMemo(() => buildScheduleRange(baseMonth), [baseMonth])
  const visibleWeeks = useMemo(() => buildVisibleWeeks(baseMonth), [baseMonth])
  const rangedPlanned = useMemo(() => getRangedPlannedItems(items, bulkFrom, bulkTo), [items, bulkFrom, bulkTo])
  const selectedStrength = useMemo(() => getSelectedStrength(items, selectedDate), [items, selectedDate])
  const selectedCardio = useMemo(() => getSelectedCardio(calendarItems, selectedDate), [calendarItems, selectedDate])

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

  async function runMutation(task: () => Promise<unknown>, opts?: { onSuccess?: () => void }) {
    setErr(null)
    try {
      await task()
      opts?.onSuccess?.()
      await load()
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
    if (!templateId || !date) return
    await runMutation(
      () => api.createScheduled(token, { athlete_id: athleteId, template_id: templateId, date }),
      { onSuccess: () => setDate('') },
    )
  }

  async function createPattern() {
    if (!patternStart || !patternEnd || !templateId) return
    await runMutation(() => api.createScheduledPattern(token, {
      athlete_id: athleteId,
      template_id: templateId,
      start_date: patternStart,
      end_date: patternEnd,
      pattern_type: patternType,
      interval_days: patternType === 'interval_days' ? intervalDays : undefined,
      weekday: patternType === 'weekday' ? weekday : undefined,
    }))
  }

  async function moveById(id: string, to: string) {
    if (!to) return
    await runMutation(() => api.moveScheduled(token, id, to))
  }

  async function copyById(id: string, to: string) {
    if (!to) return
    await runMutation(() => api.copyScheduled(token, id, to))
  }

  async function skipById(id: string) {
    await runMutation(() => api.skipScheduled(token, id))
  }

  async function deleteById(id: string) {
    await runMutation(() => api.deleteScheduled(token, id))
  }

  async function bulkShift() {
    if (!bulkFrom || !bulkTo) return
    await runMutation(() => api.bulkMoveScheduled(token, {
      athlete_id: athleteId,
      from_date: bulkFrom,
      to_date: bulkTo,
      shift_days: shiftDays,
    }))
  }

  async function bulkReplaceTemplate() {
    if (!bulkFrom || !bulkTo || !bulkTemplateId) return
    await runMutation(() => api.bulkReplaceTemplateScheduled(token, {
      athlete_id: athleteId,
      from_date: bulkFrom,
      to_date: bulkTo,
      template_id: bulkTemplateId,
    }))
  }

  async function bulkSkipRange() {
    if (!bulkFrom || !bulkTo) return
    await runMutation(() => api.bulkSkipScheduled(token, {
      athlete_id: athleteId,
      from_date: bulkFrom,
      to_date: bulkTo,
    }))
  }

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
    rangedPlannedItems: () => rangedPlanned,
    load,
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
