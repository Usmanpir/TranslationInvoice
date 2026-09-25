import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/server/context'
import { AdminShell } from '@/components/saas-admin/AdminShell'

export const metadata: Metadata = { title: 'SaaS admin – InvoiceFlow', robots: { index: false, follow: false } }

export default async function SaasAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?callbackUrl=/saas-admin')
  // Not revealing that the area exists to regular users.
  if (!user.isSuperAdmin) notFound()
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>
}
