import { authApi } from './api/auth'
import { exportsApi } from './api/exports'
import { scheduleApi } from './api/schedule'
import { sessionsApi } from './api/sessions'
import { templatesApi } from './api/templates'

export * from './api/types'

export const api = {
  ...authApi,
  ...templatesApi,
  ...scheduleApi,
  ...sessionsApi,
  ...exportsApi,
}
