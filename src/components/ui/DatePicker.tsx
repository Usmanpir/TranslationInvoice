'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ISO = 'yyyy-MM-dd'
const DISPLAY = 'MMM d, yyyy'
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  className?: string
  id?: string
  ariaLabel?: string
}

function parseISO(value?: string | null): Date | null {
  if (!value) return null
  const d = parse(value, ISO, new Date())
  return isValid(d) ? d : null
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  disabled,
  required,
  clearable,
  className,
  id,
  ariaLabel,
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => setMounted(true), [])

  const selected = useMemo(() => parseISO(value), [value])
  const minDate = useMemo(() => parseISO(min), [min])
  const maxDate = useMemo(() => parseISO(max), [max])

  const [cursor, setCursor] = useState<Date>(() => selected ?? new Date())
  const [focusDate, setFocusDate] = useState<Date | null>(null)

  // Keep the calendar month in sync with the external value when it changes.
  useEffect(() => {
    if (selected) setCursor(selected)
  }, [selected])

  // Reset focus-date every time the popover opens.
  useEffect(() => {
    if (open) {
      setFocusDate(selected ?? stripTime(new Date()))
      setCursor(selected ?? new Date())
    }
  }, [open, selected])

  const positionPopover = useCallback(() => {
    const btn = triggerRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const POP_W = 300
    const margin = 8
    const viewportW = window.innerWidth
    let left = rect.left
    // Flip if it would overflow the right edge.
    if (left + POP_W + margin > viewportW) {
      left = Math.max(margin, viewportW - POP_W - margin)
    }
    setCoords({
      top: rect.bottom + window.scrollY + 6,
      left: left + window.scrollX,
      width: rect.width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    positionPopover()
    const onResize = () => positionPopover()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, positionPopover])

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor)
    const monthEnd = endOfMonth(cursor)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  const isDisabled = useCallback(
    (d: Date) => {
      const day = stripTime(d)
      if (minDate && day < stripTime(minDate)) return true
      if (maxDate && day > stripTime(maxDate)) return true
      return false
    },
    [minDate, maxDate]
  )

  const choose = (d: Date) => {
    if (isDisabled(d)) return
    onChange(format(d, ISO))
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (!focusDate) return
    let next: Date | null = null
    switch (e.key) {
      case 'ArrowLeft':
        next = new Date(focusDate); next.setDate(next.getDate() - 1); break
      case 'ArrowRight':
        next = new Date(focusDate); next.setDate(next.getDate() + 1); break
      case 'ArrowUp':
        next = new Date(focusDate); next.setDate(next.getDate() - 7); break
      case 'ArrowDown':
        next = new Date(focusDate); next.setDate(next.getDate() + 7); break
      case 'PageUp':
        next = subMonths(focusDate, 1); break
      case 'PageDown':
        next = addMonths(focusDate, 1); break
      case 'Home':
        next = startOfWeek(focusDate, { weekStartsOn: 1 }); break
      case 'End':
        next = endOfWeek(focusDate, { weekStartsOn: 1 }); break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(focusDate)
        return
      default:
        return
    }
    e.preventDefault()
    if (next) {
      setFocusDate(next)
      if (!isSameMonth(next, cursor)) setCursor(next)
    }
  }

  const today = stripTime(new Date())
  const display = selected ? format(selected, DISPLAY) : ''

  const popover =
    mounted && open && coords
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            aria-label="Choose date"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[70] w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200/70 p-3 animate-[fadeIn_100ms_ease-out]"
            onKeyDown={onKeyNav}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setCursor((d) => subMonths(d, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold text-slate-900 tracking-tight">
                {format(cursor, 'MMMM yyyy')}
              </div>
              <button
                type="button"
                onClick={() => setCursor((d) => addMonths(d, 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1 px-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="h-7 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 px-1" role="grid">
              {days.map((d) => {
                const outside = !isSameMonth(d, cursor)
                const isSelected = selected && isSameDay(d, selected)
                const isToday = isSameDay(d, today)
                const isFocus = focusDate && isSameDay(d, focusDate)
                const disabledDay = isDisabled(d)
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    role="gridcell"
                    aria-selected={!!isSelected}
                    disabled={disabledDay}
                    tabIndex={isFocus ? 0 : -1}
                    onClick={() => choose(d)}
                    onFocus={() => setFocusDate(d)}
                    className={cn(
                      'h-9 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      disabledDay
                        ? 'text-slate-300 cursor-not-allowed'
                        : isSelected
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : outside
                            ? 'text-slate-300 hover:bg-slate-50'
                            : 'text-slate-700 hover:bg-slate-100',
                      !isSelected && isToday && 'ring-1 ring-inset ring-brand-500/40 text-brand-700'
                    )}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 px-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  if (!isDisabled(now)) choose(now)
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50"
              >
                Today
              </button>
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'relative w-full h-10 pl-9 pr-8 text-left text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400',
          'hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500 transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <span className={cn('truncate block', !display && 'text-slate-400')}>
          {display || placeholder}
        </span>
        {clearable && value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
      {/* Hidden mirror for native form submission / required validation. */}
      {required && (
        <input
          type="hidden"
          value={value}
          required
          readOnly
          tabIndex={-1}
          aria-hidden
        />
      )}
      {popover}
    </>
  )
}
