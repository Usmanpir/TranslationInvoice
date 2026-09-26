'use client'
import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/**
 * Theme switcher.
 * - `segmented`: Light / Dark / System pill (sidebar, profile).
 * - `icon`: a single button that toggles light ↔ dark (compact headers).
 * `onDark` styles it for always-dark surfaces like the sidebar.
 */
export function ThemeToggle({ variant = 'icon', onDark = false, className }: { variant?: 'icon' | 'segmented'; onDark?: boolean; className?: string }) {
  const { theme, resolved, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn(
          'inline-flex items-center gap-0.5 p-0.5 rounded-xl',
          onDark ? 'bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]' : 'bg-slate-100 ring-1 ring-inset ring-slate-200/70',
          className
        )}
      >
        {OPTIONS.map((o) => {
          const active = mounted && theme === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.label}
              title={o.label}
              onClick={() => setTheme(o.value)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all',
                onDark
                  ? active
                    ? 'bg-white/[0.12] text-white'
                    : 'text-ink-400 hover:text-white'
                  : active
                    ? 'bg-card text-slate-900 shadow-[0_1px_2px_0_rgb(15_23_42/0.12)]'
                    : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <o.icon className="w-3.5 h-3.5" />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const dark = mounted && resolved === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={cn(
        'relative inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
        onDark ? 'text-ink-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
        className
      )}
    >
      <Sun className={cn('w-[18px] h-[18px] transition-all', dark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100')} />
      <Moon className={cn('absolute w-[18px] h-[18px] transition-all', dark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0')} />
    </button>
  )
}
