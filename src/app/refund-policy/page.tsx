import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'
import { TRIAL } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Refund Policy – InvoiceFlow',
  description: 'Cancellations and refunds for InvoiceFlow subscriptions.',
  alternates: { canonical: '/refund-policy' },
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="September 25, 2026"
      intro="We want you to be confident before you pay, which is why every workspace starts with a free trial. This policy explains cancellations and refunds for paid plans."
      sections={[
        {
          heading: 'Free trial',
          body: [`The ${TRIAL.days}-day trial is free and requires no payment details, so no refund is needed if you decide InvoiceFlow is not for you.`],
        },
        {
          heading: 'Cancellation',
          body: [
            'You can cancel a paid plan at any time from the Billing page. Your plan remains active until the end of the current billing period, after which the workspace moves to the Free plan.',
          ],
        },
        {
          heading: 'Monthly plans',
          body: ['Monthly payments are non-refundable once the billing period has started, except where required by law.'],
        },
        {
          heading: 'Yearly plans',
          body: ['If you cancel a yearly plan within 14 days of the initial purchase, you may request a full refund. After 14 days, yearly plans are non-refundable but remain active until the end of the term.'],
        },
        {
          heading: 'Billing errors',
          body: ['If you were charged in error (for example, a duplicate charge), contact us and we will correct it promptly.'],
        },
        { heading: 'How to request a refund', body: ['Send a request through the contact page with your workspace name and payment reference.'] },
      ]}
    />
  )
}
