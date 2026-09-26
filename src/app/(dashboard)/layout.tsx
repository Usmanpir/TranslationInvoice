import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getOrgContext, toClientWorkspace } from '@/lib/server/context'
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar'
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider'
import { Logo } from '@/components/ui/Logo'

export const metadata: Metadata = { title: 'InvoiceFlow', robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext()
  if (!ctx) {
    // Signed in but without a workspace (e.g. removed from their only one): let them create one.
    if (await getCurrentUser()) redirect('/onboarding')
    redirect('/login')
  }
  if (!ctx.organization.onboardingCompletedAt && ctx.role === 'OWNER') redirect('/onboarding')

  const workspace = toClientWorkspace(ctx)

  return (
    <WorkspaceProvider value={workspace}>
      <div className="min-h-screen bg-surface-50">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen flex flex-col">
          {/* Mobile / tablet top bar */}
          <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-16 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/70">
            <MobileSidebar />
            <Link href="/dashboard" aria-label="Dashboard">
              <Logo markClassName="w-8 h-8 rounded-[10px]" textClassName="text-base" />
            </Link>
            <NotificationBell />
          </div>

          <SubscriptionBanner />
          <div className="flex-1 animate-fade-in">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  )
}
