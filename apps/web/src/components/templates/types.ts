export type EditableTemplateExercise = {
  exercise_id: string
  planned_sets: number
  planned_reps: number
  planned_weight?: number
  rest_seconds?: number
  notes?: string
}

export type EditableTemplate = {
  id: string
  name: string
  notes: string
  exercises: EditableTemplateExercise[]
}
