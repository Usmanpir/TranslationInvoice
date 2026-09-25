import type { Metadata } from 'next'
// Self-hosted fonts (bundled from npm) so builds never depend on Google Fonts being reachable.
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'InvoiceFlow – Bills, Invoices & Quotations',
  description: 'Professional invoice and quotation management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
