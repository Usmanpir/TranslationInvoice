import { cn, statusColors } from '@/lib/utils'

type Status = keyof typeof statusColors

export function StatusBadge({ status }: { status: Status }) {
  const colors = statusColors[status] || statusColors.PENDING
  return (
    <span className={cn('badge', colors.bg, colors.text, colors.border)}>
      <span className="relative flex w-1.5 h-1.5">
        {(status === 'OVERDUE' || status === 'PENDING') && (
          <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', colors.dot)} />
        )}
        <span className={cn('relative w-1.5 h-1.5 rounded-full', colors.dot)} />
      </span>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
