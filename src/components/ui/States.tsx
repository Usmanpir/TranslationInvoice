import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Loading ---------- */

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24 animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-11 h-11">
          <div className="absolute inset-0 rounded-full border-[3px] border-brand-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-brand-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-4 h-4 animate-spin', className)} />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden animate-fade-in" aria-busy="true" aria-label="Loading">
      <div className="h-11 bg-slate-50/80 border-b border-slate-200/70" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-6 py-4">
            <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <div
                key={c}
                className={cn('skeleton h-3.5', c === 0 ? 'w-40' : 'hidden md:block flex-1 max-w-[140px]')}
                style={{ opacity: 1 - c * 0.12 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Empty ---------- */

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card relative overflow-hidden px-6 py-16 sm:py-20 text-center animate-fade-up', className)}>
      <div aria-hidden className="absolute inset-0 bg-grid mask-radial opacity-60" />
      <div className="relative">
        <div className="relative mx-auto mb-5 w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-brand-500/10 blur-xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-slate-200 shadow-card flex items-center justify-center">
            <Icon className="w-7 h-7 text-brand-600" strokeWidth={1.75} />
          </div>
        </div>
        <p className="font-display text-lg font-semibold text-slate-900">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">{description}</p>}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}

/* ---------- Inline alerts ---------- */

export function Alert({
  variant = 'error',
  children,
  className,
}: {
  variant?: 'error' | 'success'
  children: React.ReactNode
  className?: string
}) {
  const isError = variant === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 p-3.5 rounded-xl border text-sm animate-fade-in',
        isError ? 'bg-red-50/80 border-red-200 text-red-700' : 'bg-emerald-50/80 border-emerald-200 text-emerald-700',
        className
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/* ---------- Pagination ---------- */

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 mt-5">
      <p className="text-sm text-slate-500">
        Page <span className="font-medium text-slate-900">{page}</span> of{' '}
        <span className="font-medium text-slate-900">{pages}</span>
      </p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary btn-sm">
          Previous
        </button>
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages} className="btn-secondary btn-sm">
          Next
        </button>
      </div>
    </div>
  )
}
