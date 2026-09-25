// Notification catalogue shared by server (creation) and client (preferences UI).

export const NOTIFICATION_TYPES = {
  'invoice.overdue': { label: 'Invoice overdue', description: 'An invoice passed its due date unpaid.' },
  'invoice.paid': { label: 'Invoice paid', description: 'A payment was recorded against an invoice.' },
  'quotation.accepted': { label: 'Quotation accepted', description: 'A quotation was marked accepted.' },
  'subscription.trial_ending': { label: 'Trial ending', description: 'Your free trial ends in a few days.' },
  'subscription.trial_expired': { label: 'Trial ended', description: 'Your free trial has ended.' },
  'subscription.expired': { label: 'Subscription expired', description: 'Your subscription lapsed.' },
  'subscription.payment_failed': { label: 'Payment failed', description: 'A subscription payment could not be charged.' },
  'subscription.activated': { label: 'Subscription activated', description: 'Your plan was activated or changed.' },
  'team.invitation': { label: 'Team invitations', description: 'Someone joined or was invited to the workspace.' },
  'usage.limit_approaching': { label: 'Limit approaching', description: 'You are close to a plan limit.' },
} as const

export type NotificationType = keyof typeof NOTIFICATION_TYPES

export type NotificationPrefs = Partial<Record<NotificationType, { inApp: boolean; email: boolean }>>

export function prefFor(prefs: NotificationPrefs | null | undefined, type: NotificationType) {
  return prefs?.[type] ?? { inApp: true, email: true }
}
