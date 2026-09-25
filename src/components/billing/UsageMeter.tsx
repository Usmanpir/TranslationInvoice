import { cn } from '@/lib/utils'

/** Usage bar, e.g. "Invoices 78 / 100". Turns amber at 80% and red at 100%. */
export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const tone = limit === null ? 'bg-brand-600' : pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-600'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-sm tabular-nums">
          <span className="font-semibold text-slate-900">{used.toLocaleString()}</span>
          <span className="text-slate-400"> / {limit === null ? '∞' : limit.toLocaleString()}</span>
        </p>
      </div>
      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit ?? undefined}
      >
        <div className={cn('h-full rounded-full transition-all duration-700', tone)} style={{ width: limit === null ? '4%' : `${Math.max(pct, used > 0 ? 3 : 0)}%` }} />
      </div>
      {limit !== null && pct >= 80 && (
        <p className={cn('text-xs mt-1', pct >= 100 ? 'text-red-600' : 'text-amber-600')}>{pct >= 100 ? 'Limit reached' : `${pct}% used`}</p>
      )}
    </div>
  )
}
