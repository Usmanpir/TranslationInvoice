import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LandingPage } from '@/components/landing/LandingPage'
import { BILLING_CURRENCY, PLAN_ORDER, PLANS, planPrice } from '@/lib/plans'
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site'
import { FAQ_ITEMS } from '@/components/marketing/faq'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE_DESCRIPTION,
      url: siteUrl(),
      offers: PLAN_ORDER.map((id) => ({
        '@type': 'Offer',
        name: PLANS[id].name,
        price: planPrice(id, 'MONTH'),
        priceCurrency: BILLING_CURRENCY,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <LandingPage />
    </>
  )
}
