import type { Metadata, Viewport } from 'next'
// Self-hosted fonts (bundled from npm) so builds never depend on Google Fonts being reachable.
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import { Providers } from './providers'
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site'
import { themeInitScript } from '@/lib/theme'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} – Professional Invoices & Quotations for UAE Businesses`,
    template: `%s`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['invoicing software', 'UAE VAT invoice', 'quotation software', 'TRN invoice', 'invoice generator Dubai', 'billing software'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Create professional invoices. Get paid faster.`,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_AE',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} – Create professional invoices. Get paid faster.`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a101d' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script sets the theme class before hydration, so React must not warn about it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
