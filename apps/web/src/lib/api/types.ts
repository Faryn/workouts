export type LoginResponse = { access_token: string; token_type: string }

export type Me = { id: string; email: string; role: string }
export type AthleteLite = { id: string; email: string }

export type TemplateExercise = {
  id: string
  exercise_id: string
  exercise_name?: string | null
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
  can_manage?: boolean
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
  owner_id?: string | null
  equipment?: string | null
  notes?: string | null
}

export type ExerciseCreateInput = {
  name: string
  type: 'strength' | 'cardio'
  equipment?: string
  notes?: string
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
  notes?: string | null
  started_at?: string | null
  ended_at?: string | null
  last_saved_at?: string | null
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

export type SessionAutosaveResponse = {
  id: string
  status: string
  notes?: string | null
  last_saved_at?: string | null
}

export type FinishSessionResponse = {
  id: string
  status: string
  scheduled_workout_status?: string | null
}
