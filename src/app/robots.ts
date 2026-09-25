import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

const PRIVATE = [
  '/api/',
  '/dashboard',
  '/customers',
  '/invoices',
  '/quotations',
  '/payments',
  '/reports',
  '/team',
  '/settings',
  '/billing',
  '/audit',
  '/profile',
  '/onboarding',
  '/invite/',
  '/reset-password/',
  '/saas-admin',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
