import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar'
import { Logo } from '@/components/ui/Logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-16 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/70">
          <MobileSidebar />
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo markClassName="w-8 h-8 rounded-[10px]" textClassName="text-base" />
          </Link>
          <div className="w-10" aria-hidden />
        </div>

        <div className="flex-1 animate-fade-in">{children}</div>
      </main>
    </div>
  )
}
