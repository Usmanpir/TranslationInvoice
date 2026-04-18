import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'lg:sticky lg:top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/70',
        className
      )}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">{children}</div>
        )}
      </div>
    </div>
  )
}
