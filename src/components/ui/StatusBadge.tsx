import { cn, statusColors } from '@/lib/utils'

type Status = keyof typeof statusColors

export function StatusBadge({ status }: { status: Status }) {
  const colors = statusColors[status] || statusColors.PENDING
  return (
    <span className={cn('badge', colors.bg, colors.text, colors.border)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
