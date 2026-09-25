import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, getOrgContext } from '@/lib/server/context'
import { hasFeature } from '@/lib/server/subscription'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { CreateWorkspace } from '@/components/onboarding/CreateWorkspace'

export const metadata: Metadata = { title: 'Set up your workspace – InvoiceFlow', robots: { index: false } }

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?callbackUrl=/onboarding')
  const { new: createNew } = await searchParams
  const ctx = await getOrgContext()

  if (!ctx || createNew) return <CreateWorkspace firstWorkspace={!ctx} userName={user.name} />
  if (ctx.organization.onboardingCompletedAt || !ctx.can('settings.manage')) redirect('/dashboard')

  const o = ctx.organization
  return (
    <OnboardingWizard
      userName={user.name}
      canBrand={hasFeature(ctx, 'customBranding')}
      trialDays={ctx.entitlements.trialDaysLeft}
      planName={ctx.entitlements.subscribedPlan.name}
      organization={{
        name: o.name,
        email: o.email,
        phone: o.phone,
        website: o.website,
        address: o.address,
        country: o.country,
        taxNumber: o.taxNumber,
        logoUploadId: o.logoUploadId,
        logoUrl: o.logoUploadId ? `/api/files/${o.logoUploadId}` : null,
        defaultCurrency: o.defaultCurrency,
        defaultTaxRate: o.defaultTaxRate,
        invoicePrefix: o.invoicePrefix,
        invoiceNextNumber: o.invoiceNextNumber,
        paymentTermsDays: o.paymentTermsDays,
        defaultNotes: o.defaultNotes,
      }}
    />
  )
}
