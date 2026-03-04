const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const extraHeaders = (init.headers ?? {}) as Record<string, string>
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export async function downloadCsv(path: string, token: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
