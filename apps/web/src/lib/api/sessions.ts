import { req } from './client'
import type {
  FinishSessionResponse,
  LogSetPayload,
  LogSetResponse,
  SessionAutosaveResponse,
  SessionDetail,
  SessionHistoryItem,
} from './types'

export const sessionsApi = {
  listSessions: (token: string, athleteId: string) => req<SessionHistoryItem[]>(`/v1/sessions/?athlete_id=${athleteId}`, {}, token),
  latestInProgressSession: (token: string, athleteId: string) => req<SessionDetail | null>(`/v1/sessions/in-progress?athlete_id=${athleteId}`, {}, token),
  getSession: (token: string, sessionId: string) => req<SessionDetail>(`/v1/sessions/${sessionId}`, {}, token),
  startSession: (token: string, payload: { scheduled_workout_id?: string; template_id?: string }) =>
    req<SessionDetail>('/v1/sessions/start', { method: 'POST', body: JSON.stringify(payload) }, token),
  logSet: (token: string, sessionId: string, payload: LogSetPayload) =>
    req<LogSetResponse>(`/v1/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(payload) }, token),
  autosaveSession: (token: string, sessionId: string, notes?: string) =>
    req<SessionAutosaveResponse>(`/v1/sessions/${sessionId}/autosave`, { method: 'POST', body: JSON.stringify({ notes }) }, token),
  finishSession: (token: string, sessionId: string) => req<FinishSessionResponse>(`/v1/sessions/${sessionId}/finish`, { method: 'POST' }, token),
}
