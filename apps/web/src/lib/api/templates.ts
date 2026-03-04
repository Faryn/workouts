import { req } from './client'
import type { ExerciseCreateInput, ExerciseOption, Template, TemplateExerciseInput } from './types'

export const templatesApi = {
  listTemplates: (token: string, athleteId?: string) =>
    req<Template[]>(athleteId ? `/v1/templates/?athlete_id=${athleteId}` : '/v1/templates/', {}, token),
  listExercises: (token: string) => req<ExerciseOption[]>('/v1/exercises/', {}, token),
  createExercise: (token: string, payload: ExerciseCreateInput) =>
    req<ExerciseOption>('/v1/exercises/', { method: 'POST', body: JSON.stringify(payload) }, token),
  createTemplate: (token: string, payload: { name: string; notes?: string; exercises?: TemplateExerciseInput[] }) =>
    req<Template>('/v1/templates/', { method: 'POST', body: JSON.stringify(payload) }, token),
  patchTemplate: (token: string, id: string, payload: { name?: string; notes?: string; exercises?: TemplateExerciseInput[] }) =>
    req<Template>(`/v1/templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  deleteTemplate: (token: string, id: string) => req<{ ok: boolean }>(`/v1/templates/${id}`, { method: 'DELETE' }, token),
}
