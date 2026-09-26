'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, CreditCard, History, LayoutGrid, Layers, Menu, Settings2, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV = [
  { name: 'Overview', href: '/saas-admin', icon: LayoutGrid, exact: true },
  { name: 'Organizations', href: '/saas-admin/organizations', icon: Building2 },
  { name: 'Subscriptions', href: '/saas-admin/subscriptions', icon: CreditCard },
  { name: 'Users', href: '/saas-admin/users', icon: Users },
  { name: 'Billing', href: '/saas-admin/billing', icon: Wallet },
  { name: 'Plans', href: '/saas-admin/plans', icon: Layers },
  { name: 'Audit logs', href: '/saas-admin/audit', icon: History },
  { name: 'System', href: '/saas-admin/system', icon: Settings2 },
]

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              active ? 'text-white bg-violet-500/15 ring-1 ring-inset ring-violet-400/30' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            )}
          >
            <item.icon className={cn('w-[18px] h-[18px]', active ? 'text-violet-300' : 'text-slate-500')} />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950 text-ink-300">
      <div className="px-5 pt-5 pb-4">
        <Logo dark />
        <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-[11px] font-semibold ring-1 ring-inset ring-violet-400/30">
          <ShieldCheck className="w-3 h-3" /> Platform admin
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Nav onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <ThemeToggle variant="segmented" onDark className="w-full" />
        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-white hover:bg-white/[0.05]">
          <ArrowLeft className="w-4 h-4" /> Back to my workspace
        </Link>
        <div className="px-3 py-2 rounded-xl bg-white/[0.04]">
          <p className="text-[13px] font-semibold text-ink-100 truncate">{user.name}</p>
          <p className="text-[11px] text-ink-500 truncate">{user.email}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-50">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 z-40">{sidebar}</aside>
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-card/80 backdrop-blur-xl border-b border-slate-200/70">
        <button onClick={() => setOpen(true)} className="icon-btn w-10 h-10" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-900">Platform admin</span>
        <span className="w-10" />
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-in-left">
            {sidebar}
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white" aria-label="Close menu">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <main className="lg:ml-60 min-h-screen">{children}</main>
    </div>
  )
}
