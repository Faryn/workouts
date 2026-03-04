import { req } from './client'
import type { AdminUser } from './types'

export const adminApi = {
  listUsers: (token: string) => req<AdminUser[]>('/v1/admin/users/', {}, token),
  createUser: (token: string, payload: { email: string; role: 'athlete' | 'trainer' | 'admin'; password: string; active?: boolean }) =>
    req<AdminUser>('/v1/admin/users/', { method: 'POST', body: JSON.stringify(payload) }, token),
  patchUser: (token: string, userId: string, payload: { email?: string; role?: 'athlete' | 'trainer' | 'admin'; active?: boolean }) =>
    req<AdminUser>(`/v1/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token),
  resetUserPassword: (token: string, userId: string, password: string) =>
    req<{ ok: boolean }>(`/v1/admin/users/${userId}/password`, { method: 'POST', body: JSON.stringify({ password }) }, token),
}
