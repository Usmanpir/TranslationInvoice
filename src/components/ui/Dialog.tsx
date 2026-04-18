'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, X } from 'lucide-react'

type Variant = 'default' | 'danger' | 'warning' | 'success' | 'info'

interface AlertOptions {
  title: string
  message?: string
  confirmLabel?: string
  variant?: Variant
}

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
}

interface DialogContextValue {
  alert: (options: AlertOptions) => Promise<void>
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider')
  return ctx
}

type DialogKind = 'alert' | 'confirm'

interface DialogState {
  kind: DialogKind
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  variant: Variant
  resolve: (value: any) => void
}

function VariantIcon({ variant }: { variant: Variant }) {
  const map: Record<Variant, { Icon: any; bg: string; color: string }> = {
    default: { Icon: Info, bg: 'bg-brand-50', color: 'text-brand-600' },
    info: { Icon: Info, bg: 'bg-brand-50', color: 'text-brand-600' },
    danger: { Icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600' },
    warning: { Icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
    success: { Icon: Info, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  }
  const { Icon, bg, color } = map[variant]
  return (
    <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
  )
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<DialogState | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => setMounted(true), [])

  const close = useCallback((value: any) => {
    setState((current) => {
      if (current) current.resolve(value)
      return null
    })
  }, [])

  const alert = useCallback<DialogContextValue['alert']>((options) => {
    return new Promise((resolve) => {
      setState({
        kind: 'alert',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'OK',
        variant: options.variant ?? 'info',
        resolve,
      })
    })
  }, [])

  const confirm = useCallback<DialogContextValue['confirm']>((options) => {
    return new Promise((resolve) => {
      setState({
        kind: 'confirm',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        variant: options.variant ?? 'default',
        resolve,
      })
    })
  }, [])

  // Focus management + ESC handling
  useEffect(() => {
    if (!state) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => confirmButtonRef.current?.focus(), 10)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(state.kind === 'confirm' ? false : undefined)
      }
    }
    window.addEventListener('keydown', handler)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [state, close])

  const dialogNode =
    mounted && state
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/70"
            >
              <button
                type="button"
                onClick={() => close(state.kind === 'confirm' ? false : undefined)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-6 flex items-start gap-4">
                <VariantIcon variant={state.variant} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 id="dialog-title" className="text-base font-semibold text-slate-900 tracking-tight pr-6">
                    {state.title}
                  </h2>
                  {state.message && (
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{state.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-1">
                {state.kind === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="btn-secondary"
                  >
                    {state.cancelLabel}
                  </button>
                )}
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => close(state.kind === 'confirm' ? true : undefined)}
                  className={state.variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialogNode}
    </DialogContext.Provider>
  )
}
