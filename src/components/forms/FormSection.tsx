import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {description && <p className="section-desc">{description}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}
