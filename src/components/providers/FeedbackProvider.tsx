'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Info, Lock, Sparkles, X } from 'lucide-react'
import { ApiRequestError, type ApiErrorDetails } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface FeedbackValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  /** Shows the upgrade dialog for plan limits / locked features. */
  showUpgrade: (message: string, details?: ApiErrorDetails) => void
  /** Routes any error to the right UI: upgrade dialog, or an error toast. Never shows raw errors. */
  handleError: (error: unknown, fallback?: string) => void
}

const FeedbackContext = createContext<FeedbackValue | null>(null)

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider')
  return ctx
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const STYLES = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-brand-600',
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [upgrade, setUpgrade] = useState<{ message: string; details?: ApiErrorDetails } | null>(null)
  const nextId = useRef(1)

  useEffect(() => setMounted(true), [])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-3), { id, kind, message }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000)
    },
    [dismiss]
  )

  const showUpgrade = useCallback((message: string, details?: ApiErrorDetails) => setUpgrade({ message, details }), [])

  const handleError = useCallback(
    (error: unknown, fallback = 'Something went wrong. Please try again.') => {
      if (error instanceof ApiRequestError) {
        if (error.isUpgradeRequired) return showUpgrade(error.message, error.details)
        return push('error', error.message)
      }
      if ((error as Error)?.name === 'AbortError') return
      push('error', fallback)
    },
    [push, showUpgrade]
  )

  const value = useMemo<FeedbackValue>(
    () => ({
      toast: {
        success: (m) => push('success', m),
        error: (m) => push('error', m),
        info: (m) => push('info', m),
      },
      showUpgrade,
      handleError,
    }),
    [push, showUpgrade, handleError]
  )

  useEffect(() => {
    if (!upgrade) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setUpgrade(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [upgrade])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="fixed z-[120] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 sm:w-96 pointer-events-none"
          >
            {toasts.map((t) => {
              const Icon = ICONS[t.kind]
              return (
                <div
                  key={t.id}
                  role={t.kind === 'error' ? 'alert' : 'status'}
                  className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-elevated ring-1 ring-slate-900/5 animate-scale-in"
                >
                  <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', STYLES[t.kind])} />
                  <p className="flex-1 text-sm text-slate-700 leading-snug">{t.message}</p>
                  <button onClick={() => dismiss(t.id)} className="icon-btn -mr-1.5 -mt-1 w-7 h-7" aria-label="Dismiss">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>,
          document.body
        )}
      {mounted && upgrade && createPortal(<UpgradeDialog {...upgrade} onClose={() => setUpgrade(null)} />, document.body)}
    </FeedbackContext.Provider>
  )
}

function UpgradeDialog({ message, details, onClose }: { message: string; details?: ApiErrorDetails; onClose: () => void }) {
  const isLimit = typeof details?.limit === 'number'
  const pct = isLimit && details!.limit ? Math.min(100, Math.round(((details!.used ?? 0) / details!.limit!) * 100)) : 0
  const title = details?.featureLabel
    ? `Unlock ${details.featureLabel.toLowerCase()}`
    : details?.resource
      ? `${capitalize(String(details.resource))} limit reached`
      : 'Upgrade required'

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated ring-1 ring-slate-900/5 overflow-hidden animate-scale-in"
      >
        <div className="relative px-6 pt-7 pb-6 bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-600 text-white">
          <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-40" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
          <div className="relative w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
            {details?.feature ? <Lock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <h2 id="upgrade-title" className="relative mt-4 font-display text-xl font-bold tracking-tight">{title}</h2>
          <p className="relative mt-1.5 text-sm text-white/85 leading-relaxed">{message}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isLimit && (
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                <span>{details?.planName} plan usage</span>
                <span className="tabular-nums text-slate-900">
                  {details?.used} / {details?.limit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {details?.lapsed && (
            <p className="text-sm text-slate-600">Your plan has lapsed, so Free plan limits apply. Your data is safe.</p>
          )}
          {details?.suggestedPlanName && (
            <p className="text-sm text-slate-600">
              Upgrade to <span className="font-semibold text-slate-900">{details.suggestedPlanName}</span> to continue.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary sm:flex-1">
            Maybe later
          </button>
          <Link href="/billing#plans" onClick={onClose} className="btn-primary sm:flex-1">
            <Sparkles className="w-4 h-4" />
            View plans
          </Link>
        </div>
      </div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
