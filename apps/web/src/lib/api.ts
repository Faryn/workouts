const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export type LoginResponse = { access_token: string; token_type: string }

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init.headers as any) || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export const api = {
  login: (email: string, password: string) => req<LoginResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => req<{ id: string; email: string; role: string }>('/v1/auth/me', {}, token),

  listTemplates: (token: string) => req<any[]>('/v1/templates/', {}, token),
  createTemplate: (token: string, name: string, notes?: string) => req<any>('/v1/templates/', { method: 'POST', body: JSON.stringify({ name, notes }) }, token),
  deleteTemplate: (token: string, id: string) => req<{ ok: boolean }>(`/v1/templates/${id}`, { method: 'DELETE' }, token),

  listScheduled: (token: string, athleteId: string) => req<any[]>(`/v1/scheduled-workouts/?athlete_id=${athleteId}`, {}, token),
  createScheduled: (token: string, payload: { athlete_id: string; template_id: string; date: string }) => req<any>('/v1/scheduled-workouts/', { method: 'POST', body: JSON.stringify(payload) }, token),
  moveScheduled: (token: string, id: string, to_date: string) => req<any>(`/v1/scheduled-workouts/${id}/move`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),
  copyScheduled: (token: string, id: string, to_date: string) => req<any>(`/v1/scheduled-workouts/${id}/copy`, { method: 'POST', body: JSON.stringify({ to_date }) }, token),

  startSession: (token: string, payload: { scheduled_workout_id?: string; template_id?: string }) => req<any>('/v1/sessions/start', { method: 'POST', body: JSON.stringify(payload) }, token),
  logSet: (token: string, sessionId: string, payload: any) => req<any>(`/v1/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(payload) }, token),
  finishSession: (token: string, sessionId: string) => req<any>(`/v1/sessions/${sessionId}/finish`, { method: 'POST' }, token)
}
