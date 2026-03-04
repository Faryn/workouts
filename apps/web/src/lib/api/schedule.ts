import { req } from './client'
import type { CalendarItem, ScheduledWorkout } from './types'

export const scheduleApi = {
  listScheduled: (token: string, athleteId: string) =>
    req<ScheduledWorkout[]>(`/v1/scheduled-workouts/?athlete_id=${athleteId}`, {}, token),
  listCalendar: (token: string, athleteId: string, fromDate: string, toDate: string) =>
    req<CalendarItem[]>(`/v1/scheduled-workouts/calendar?athlete_id=${athleteId}&from_date=${fromDate}&to_date=${toDate}`, {}, token),
  createScheduled: (token: string, payload: { athlete_id: string; template_id: string; date: string }) =>
    req<ScheduledWorkout>('/v1/scheduled-workouts/', { method: 'POST', body: JSON.stringify(payload) }, token),
  createScheduledPattern: (
    token: string,
    payload: {
      athlete_id: string
      template_id: string
      start_date: string
      end_date: string
      pattern_type: 'interval_days' | 'weekday'
      interval_days?: number
      weekday?: string
    },
  ) => req<ScheduledWorkout[]>('/v1/scheduled-workouts/pattern', { method: 'POST', body: JSON.stringify(payload) }, token),
  moveScheduled: (token: string, id: string, to_date: string) =>
    req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/move`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),
  copyScheduled: (token: string, id: string, to_date: string) =>
    req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/copy`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),
  skipScheduled: (token: string, id: string) => req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/skip`, { method: 'POST' }, token),
  deleteScheduled: (token: string, id: string) => req<{ ok: boolean }>(`/v1/scheduled-workouts/${id}`, { method: 'DELETE' }, token),
}
