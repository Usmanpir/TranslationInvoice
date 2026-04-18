import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 bg-white/85 backdrop-blur border-b border-slate-200/70">
          <MobileSidebar />
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight">InvoiceFlow</span>
          </Link>
          <div className="w-10" aria-hidden />
        </div>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
