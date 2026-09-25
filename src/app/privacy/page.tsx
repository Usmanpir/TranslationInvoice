import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy – InvoiceFlow',
  description: 'How InvoiceFlow collects, uses and protects your data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="September 25, 2026"
      intro="This policy explains what personal data InvoiceFlow (“we”, “us”) processes when you use our website and invoicing platform, why we process it, and the choices you have."
      sections={[
        {
          heading: 'Data we collect',
          body: [
            'Account data: your name, email address, phone number and a hashed password.',
            'Workspace data you enter: company details, tax registration numbers, bank details, customers, quotations, invoices, payments and uploaded files such as logos and payment proofs.',
            'Technical data: IP address, browser type and security logs used to protect accounts and prevent abuse.',
            'Billing data: subscription plan and payment status. Card details are processed by our payment provider (Stripe) and are never stored on our servers.',
          ],
        },
        {
          heading: 'How we use data',
          body: [
            'To provide the service: creating documents, calculating totals and VAT, sending invitations and notifications.',
            'To secure the platform: authentication, rate limiting, fraud prevention and audit logs.',
            'To bill for subscriptions and communicate about your account, including trial and payment reminders.',
          ],
        },
        {
          heading: 'Data about your customers',
          body: [
            'For the business data you store about your own customers, you act as the data controller and we act as your processor. We process it only to provide the service to you.',
          ],
        },
        {
          heading: 'Sharing',
          body: [
            'We use trusted sub-processors for hosting (Vercel), databases, email delivery (Resend) and payments (Stripe). We do not sell personal data.',
            'We may disclose data when required by law or to protect the rights and safety of our users.',
          ],
        },
        {
          heading: 'Retention and deletion',
          body: [
            'We keep workspace data while your account is active. When a subscription ends your data remains available on the Free plan. You may request deletion of your workspace at any time via our contact page.',
          ],
        },
        {
          heading: 'Security',
          body: [
            'Workspaces are logically isolated, access is authorized on the server for every request, passwords are hashed, uploaded files are private to your workspace and traffic is encrypted with TLS.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'Depending on your location you may have the right to access, correct, export or delete your personal data, and to object to certain processing. Contact us to exercise these rights.',
          ],
        },
        { heading: 'Contact', body: ['Questions about this policy can be sent through our contact page.'] },
      ]}
    />
  )
}
