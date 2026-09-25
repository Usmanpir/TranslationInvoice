// Public site settings used for SEO (canonical URLs, sitemap, Open Graph).
export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'InvoiceFlow'

export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  return raw.replace(/\/$/, '')
}

export const SITE_DESCRIPTION =
  'Create professional, VAT-ready invoices and quotations, track payments and manage your team. Invoicing software built for UAE businesses. Start a free trial.'
