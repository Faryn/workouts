const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export type LoginResponse = { access_token: string; token_type: string }

export type Me = { id: string; email: string; role: string }
export type AthleteLite = { id: string; email: string }

export type TemplateExercise = {
  id: string
  exercise_id: string
  sort_order: number
  planned_sets: number
  planned_reps: number
  planned_weight?: number | null
  rest_seconds?: number | null
  notes?: string | null
}

export type Template = {
  id: string
  name: string
  notes?: string | null
  owner_id: string
  exercises: TemplateExercise[]
}

export type TemplateExerciseInput = {
  exercise_id: string
  sort_order?: number
  planned_sets: number
  planned_reps: number
  planned_weight?: number
  rest_seconds?: number
  notes?: string
}

export type ExerciseOption = {
  id: string
  name: string
  type: 'strength' | 'cardio'
  owner_scope: string
}

export type ScheduledWorkout = {
  id: string
  athlete_id: string
  template_id: string
  date: string
  status: 'planned' | 'completed' | 'skipped'
  source: 'trainer' | 'athlete' | 'api'
  notes?: string | null
}

export type CalendarStrengthItem = {
  kind: 'strength'
  id: string
  date: string
  status: 'planned' | 'completed' | 'skipped'
  template_id: string
  template_name: string
}

export type CalendarCardioItem = {
  kind: 'cardio'
  id: string
  date: string
  type: string
  duration_seconds: number
  distance?: number | null
  notes?: string | null
}

export type CalendarItem = CalendarStrengthItem | CalendarCardioItem

export type SessionHistoryItem = {
  id: string
  athlete_id: string
  scheduled_workout_id?: string | null
  status: string
  started_at?: string | null
  ended_at?: string | null
  duration_seconds?: number | null
  exercise_count: number
}

export type SessionSet = {
  id: string
  set_number: number
  planned_weight?: number | null
  planned_reps?: number | null
  actual_weight?: number | null
  actual_reps?: number | null
  status: 'done' | 'skipped'
  notes?: string | null
}

export type LoggedExercise = {
  id: string
  exercise_id: string
  sort_order: number
  sets: SessionSet[]
}

export type SessionDetail = {
  id: string
  athlete_id: string
  scheduled_workout_id?: string | null
  status: string
  logged_exercises: LoggedExercise[]
}

export type LogSetPayload = {
  logged_exercise_id: string
  set_number: number
  actual_weight?: number | null
  actual_reps?: number | null
  status: 'done' | 'skipped'
  notes?: string
}

export type LogSetResponse = {
  id: string
  set_number: number
  planned_weight?: number | null
  planned_reps?: number | null
  actual_weight?: number | null
  actual_reps?: number | null
  status: 'done' | 'skipped'
  notes?: string | null
}

export type FinishSessionResponse = {
  id: string
  status: string
  scheduled_workout_status?: string | null
}

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const extraHeaders = (init.headers ?? {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

async function downloadCsv(path: string, token: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  login: (email: string, password: string) => req<LoginResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => req<Me>('/v1/auth/me', {}, token),
  assignedAthletes: (token: string) => req<AthleteLite[]>('/v1/auth/assigned-athletes', {}, token),

  listTemplates: (token: string) => req<Template[]>('/v1/templates/', {}, token),
  listExercises: (token: string) => req<ExerciseOption[]>('/v1/exercises/', {}, token),
  createTemplate: (token: string, payload: { name: string; notes?: string; exercises?: TemplateExerciseInput[] }) =>
    req<Template>('/v1/templates/', { method: 'POST', body: JSON.stringify(payload) }, token),
  patchTemplate: (token: string, id: string, payload: { name?: string; notes?: string; exercises?: TemplateExerciseInput[] }) =>
    req<Template>(`/v1/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  deleteTemplate: (token: string, id: string) => req<{ ok: boolean }>(`/v1/templates/${id}`, { method: 'DELETE' }, token),

  listScheduled: (token: string, athleteId: string) => req<ScheduledWorkout[]>(`/v1/scheduled-workouts/?athlete_id=${athleteId}`, {}, token),
  listCalendar: (token: string, athleteId: string, fromDate: string, toDate: string) =>
    req<CalendarItem[]>(`/v1/scheduled-workouts/calendar?athlete_id=${athleteId}&from_date=${fromDate}&to_date=${toDate}`, {}, token),
  createScheduled: (token: string, payload: { athlete_id: string; template_id: string; date: string }) => req<ScheduledWorkout>('/v1/scheduled-workouts/', { method: 'POST', body: JSON.stringify(payload) }, token),
  moveScheduled: (token: string, id: string, to_date: string) => req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/move`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),
  copyScheduled: (token: string, id: string, to_date: string) => req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/copy`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),
  skipScheduled: (token: string, id: string) => req<ScheduledWorkout>(`/v1/scheduled-workouts/${id}/skip`, { method: 'POST' }, token),

  listSessions: (token: string, athleteId: string) => req<SessionHistoryItem[]>(`/v1/sessions/?athlete_id=${athleteId}`, {}, token),
  latestInProgressSession: (token: string, athleteId: string) => req<SessionDetail | null>(`/v1/sessions/in-progress?athlete_id=${athleteId}`, {}, token),
  getSession: (token: string, sessionId: string) => req<SessionDetail>(`/v1/sessions/${sessionId}`, {}, token),
  startSession: (token: string, payload: { scheduled_workout_id?: string; template_id?: string }) => req<SessionDetail>('/v1/sessions/start', { method: 'POST', body: JSON.stringify(payload) }, token),
  logSet: (token: string, sessionId: string, payload: LogSetPayload) => req<LogSetResponse>(`/v1/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(payload) }, token),
  finishSession: (token: string, sessionId: string) => req<FinishSessionResponse>(`/v1/sessions/${sessionId}/finish`, { method: 'POST' }, token),

  exportSessionsCsv: (token: string, athleteId: string) => downloadCsv(`/v1/exports/sessions.csv?athlete_id=${athleteId}`, token, 'sessions.csv'),
  exportExerciseHistoryCsv: (token: string, athleteId: string) => downloadCsv(`/v1/exports/exercise-history.csv?athlete_id=${athleteId}`, token, 'exercise-history.csv'),
  exportCardioCsv: (token: string, athleteId: string) => downloadCsv(`/v1/exports/cardio.csv?athlete_id=${athleteId}`, token, 'cardio.csv'),
}
