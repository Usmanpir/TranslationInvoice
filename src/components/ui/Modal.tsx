'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, type LucideIcon } from 'lucide-react'

interface ModalProps {
  title: string
  description?: string
  icon?: LucideIcon
  onClose: () => void
  children: React.ReactNode
}

/** Presentational modal shell (backdrop, panel, header). Behaviour is left to the caller. */
export function Modal({ title, description, icon: Icon, onClose, children }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-card rounded-t-3xl sm:rounded-3xl shadow-elevated ring-1 ring-slate-900/5 animate-scale-in"
      >
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-4">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-600/25 ring-1 ring-inset ring-white/20">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="font-display text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
