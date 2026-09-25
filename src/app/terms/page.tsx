import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/LegalPage'
import { TRIAL } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Terms of Service – InvoiceFlow',
  description: 'The terms that govern your use of InvoiceFlow.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="September 25, 2026"
      intro="These terms govern access to and use of InvoiceFlow. By creating an account you agree to them on behalf of yourself and the business you represent."
      sections={[
        {
          heading: 'Accounts and workspaces',
          body: [
            'You must provide accurate information and keep your password secure. You are responsible for activity in your workspace, including actions by team members you invite.',
            'Workspace owners and admins control who has access to the workspace and its data.',
          ],
        },
        {
          heading: 'Free trial and plans',
          body: [
            `New workspaces receive a ${TRIAL.days}-day free trial. After the trial the workspace continues on the Free plan unless a paid plan is selected.`,
            'Plan limits (such as invoices per month and team members) are described on the pricing page and may change with reasonable notice.',
          ],
        },
        {
          heading: 'Payment and renewal',
          body: [
            'Paid plans are billed in advance, monthly or yearly, and renew automatically until canceled. Prices are shown in AED and may be subject to VAT.',
            'If a payment fails we may limit premium features until payment is resolved. Your data is not deleted because of a failed payment.',
          ],
        },
        {
          heading: 'Your content',
          body: [
            'You retain all rights to the data you enter. You grant us the limited rights needed to host, process and display it to provide the service.',
            'You are responsible for the accuracy of your invoices, tax calculations and compliance with tax law, including UAE VAT regulations. InvoiceFlow is a tool and does not provide tax or legal advice.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: ['You may not use the service for unlawful purposes, to send fraudulent invoices, to attempt to access other workspaces, or to disrupt the platform.'],
        },
        {
          heading: 'Availability',
          body: ['We aim for high availability but the service is provided “as is”. Planned maintenance will be announced where practical.'],
        },
        {
          heading: 'Liability',
          body: ['To the extent permitted by law, our total liability is limited to the fees you paid in the twelve months before the claim.'],
        },
        {
          heading: 'Termination',
          body: ['You can cancel at any time from the Billing page. We may suspend workspaces that breach these terms. Suspended workspaces keep their data in read-only mode.'],
        },
        { heading: 'Governing law', body: ['These terms are governed by the laws of the United Arab Emirates, unless mandatory local law provides otherwise.'] },
      ]}
    />
  )
}
