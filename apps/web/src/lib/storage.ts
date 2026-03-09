export const sessionMarkerStorage = {
  get(): string | null {
    return sessionStorage.getItem('auth-session')
  },
  set() {
    sessionStorage.setItem('auth-session', '1')
    localStorage.removeItem('token')
  },
  clear() {
    sessionStorage.removeItem('auth-session')
    sessionStorage.removeItem('token')
    localStorage.removeItem('token')
  },
}
