'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'

interface ThemeValue {
  /** What the user picked. */
  theme: ThemePreference
  /** What is actually shown right now. */
  resolved: 'light' | 'dark'
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  // Sync with what the inline script already applied.
  useEffect(() => {
    const stored = readStored()
    setThemeState(stored)
    setResolved(stored === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : stored)
  }, [])

  // Follow the OS setting while on "system".
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = mq.matches ? 'dark' : 'light'
      setResolved(next)
      apply(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return
      const next = readStored()
      setThemeState(next)
      const r = next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next
      setResolved(r)
      apply(r)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode / blocked storage: the choice still applies for this page view.
    }
    const r = next === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : next
    setResolved(r)
    apply(r)
  }, [])

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
