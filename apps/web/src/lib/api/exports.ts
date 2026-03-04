import { downloadCsv } from './client'

export const exportsApi = {
  exportSessionsCsv: (token: string, athleteId: string) =>
    downloadCsv(`/v1/exports/sessions.csv?athlete_id=${athleteId}`, token, 'sessions.csv'),
  exportExerciseHistoryCsv: (token: string, athleteId: string) =>
    downloadCsv(`/v1/exports/exercise-history.csv?athlete_id=${athleteId}`, token, 'exercise-history.csv'),
  exportCardioCsv: (token: string, athleteId: string) =>
    downloadCsv(`/v1/exports/cardio.csv?athlete_id=${athleteId}`, token, 'cardio.csv'),
}
