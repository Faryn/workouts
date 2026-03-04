import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export function RequireRole(props: {
  role: string
  allow: string[]
  children: ReactNode
  fallbackTo?: string
}) {
  if (!props.allow.includes(props.role)) {
    return <Navigate to={props.fallbackTo ?? '/'} replace />
  }
  return <>{props.children}</>
}
