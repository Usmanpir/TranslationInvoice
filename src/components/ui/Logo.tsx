import { cn } from '@/lib/utils'

interface LogoMarkProps {
  className?: string
}

/** Stacked-document mark used across the app. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <div
      className={cn(
        'relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-600/25 ring-1 ring-inset ring-white/20',
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-[55%] h-[55%] text-white" aria-hidden>
        <path d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" fill="currentColor" fillOpacity=".22" />
        <path d="M14.5 3.5V8H19M14.5 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 19 19V8l-4.5-4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9.5 12.5h5M9.5 16h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </div>
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  textClassName?: string
  dark?: boolean
}

export function Logo({ className, markClassName, textClassName, dark }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          'font-display text-[17px] font-bold tracking-tight',
          dark ? 'text-white' : 'text-slate-900',
          textClassName
        )}
      >
        Invoice<span className={dark ? 'text-brand-300' : 'text-brand-600'}>Flow</span>
      </span>
    </span>
  )
}
