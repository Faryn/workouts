import { req } from './client'
import type { AthleteLite, LoginResponse, Me } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    req<LoginResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => req<Me>('/v1/auth/me', {}, token),
  assignedAthletes: (token: string) => req<AthleteLite[]>('/v1/auth/assigned-athletes', {}, token),
}
