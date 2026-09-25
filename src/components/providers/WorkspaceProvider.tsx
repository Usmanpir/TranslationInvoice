'use client'
import { createContext, useContext, useMemo } from 'react'
import type { ClientWorkspace } from '@/lib/server/context'
import type { Permission } from '@/lib/permissions'
import type { Feature } from '@/lib/plans'

interface WorkspaceValue extends ClientWorkspace {
  /** UI hint only — every action is re-authorized on the server. */
  can: (permission: Permission) => boolean
  hasFeature: (feature: Feature) => boolean
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

export function WorkspaceProvider({ value, children }: { value: ClientWorkspace; children: React.ReactNode }) {
  const ctx = useMemo<WorkspaceValue>(() => {
    const perms = new Set(value.permissions)
    const features = new Set(value.subscription.features)
    return {
      ...value,
      can: (p) => perms.has(p),
      hasFeature: (f) => features.has(f),
    }
  }, [value])
  return <WorkspaceContext.Provider value={ctx}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside the app layout')
  return ctx
}
