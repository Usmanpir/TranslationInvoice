'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Point {
  month: string // YYYY-MM
  total: number
}

function niceMax(value: number) {
  if (value <= 0) return 1000
  const exp = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / exp
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * exp
}

function monthLabel(key: string, long = false) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', long ? { month: 'long', year: 'numeric' } : { month: 'short' })
}

const compact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/**
 * Single-series column chart (paid revenue per month). One hue, 24px-capped columns with
 * 4px rounded caps on a shared baseline, hairline grid, per-column hover tooltip, and an
 * equivalent table for assistive tech.
 */
export function RevenueChart({ data, currency }: { data: Point[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.total), 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const peakIndex = data.reduce((best, d, i) => (d.total > data[best].total ? i : best), 0)
  const hasData = data.some((d) => d.total > 0)
  const PLOT_H = 200

  return (
    <div>
      <div className="relative flex" style={{ height: PLOT_H + 28 }}>
        {/* Y axis */}
        <div className="relative w-12 flex-shrink-0" style={{ height: PLOT_H }} aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-slate-400"
              style={{ top: PLOT_H - (t / max) * PLOT_H }}
            >
              {compact(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-x-0 top-0" style={{ height: PLOT_H }} aria-hidden>
            {ticks.map((t) => (
              <div
                key={t}
                className={t === 0 ? 'absolute inset-x-0 h-px bg-slate-300' : 'absolute inset-x-0 h-px bg-slate-100'}
                style={{ top: PLOT_H - (t / max) * PLOT_H }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 flex items-end" style={{ height: PLOT_H }} role="presentation">
            {data.map((d, i) => {
              const h = (d.total / max) * PLOT_H
              const active = hover === i
              return (
                <div
                  key={d.month}
                  className="relative flex-1 h-full flex items-end justify-center cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${monthLabel(d.month, true)}: ${formatCurrency(d.total, currency)}`}
                >
                  {active && <div className="absolute inset-y-0 inset-x-[2px] rounded-md bg-slate-100/70" aria-hidden />}
                  <div
                    className="relative w-full max-w-[24px] mx-[1px] rounded-t-[4px] transition-[height,opacity] duration-500"
                    style={{
                      height: Math.max(d.total > 0 ? 2 : 0, h),
                      backgroundColor: 'rgb(var(--c-chart-1))',
                      opacity: hover === null || active ? 1 : 0.55,
                    }}
                  />
                  {i === peakIndex && hasData && hover === null && (
                    <span
                      className="absolute text-[11px] font-semibold tabular-nums text-slate-700 whitespace-nowrap"
                      style={{ bottom: h + 6 }}
                    >
                      {compact(d.total)}
                    </span>
                  )}
                  {active && (
                    <div
                      className="absolute z-10 px-3 py-2 rounded-xl bg-ink-900 text-white shadow-elevated whitespace-nowrap pointer-events-none"
                      style={{ bottom: Math.min(PLOT_H - 40, h + 10) }}
                    >
                      <p className="text-[11px] text-ink-300">{monthLabel(d.month, true)}</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(d.total, currency)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* X axis */}
          <div className="absolute inset-x-0 flex" style={{ top: PLOT_H + 8 }} aria-hidden>
            {data.map((d, i) => (
              <span
                key={d.month}
                className={
                  'flex-1 text-center text-[11px] ' +
                  (hover === i ? 'text-slate-900 font-medium' : 'text-slate-400') +
                  (i % 2 === 1 ? ' hidden sm:block' : '')
                }
              >
                {monthLabel(d.month)}
              </span>
            ))}
          </div>

          {!hasData && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: PLOT_H }}>
              <p className="px-3 py-1.5 rounded-lg bg-card/90 text-sm text-slate-500 ring-1 ring-slate-200">
                Revenue appears here once invoices are paid.
              </p>
            </div>
          )}
        </div>
      </div>

      <table className="sr-only">
        <caption>Paid revenue per month ({currency})</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{monthLabel(d.month, true)}</td>
              <td>{formatCurrency(d.total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
