'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LayoutDashboard, Users, Receipt, FileQuestion, LogOut, Settings, ShieldCheck, Menu, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Quotations', href: '/quotations', icon: FileQuestion },
]

const adminNavigation = [
  { name: 'Users', href: '/users', icon: ShieldCheck },
]

function NavLink({
  item,
  active,
  onClick,
}: {
  item: { name: string; href: string; icon: any }
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'text-white bg-gradient-to-r from-white/[0.12] to-white/[0.04] ring-1 ring-inset ring-white/10 shadow-[0_4px_16px_-6px_rgb(0_0_0/0.5)]'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
      )}
    >
      {active && (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 bg-gradient-to-b from-brand-300 to-brand-500 rounded-r-full shadow-[0_0_12px_rgb(54_170_248/0.8)]" aria-hidden />
      )}
      <item.icon
        className={cn(
          'w-[18px] h-[18px] flex-shrink-0 transition-colors',
          active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'
        )}
      />
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-slate-950 text-slate-300 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.22),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

      {/* Logo */}
      <div className="relative px-5 pt-5 pb-4">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <Logo dark />
          {session?.user?.companyName && (
            <p className="text-[11px] text-slate-500 truncate mt-1.5 pl-[46px] max-w-[200px]">{session.user.companyName}</p>
          )}
        </Link>
      </div>

      {/* Quick create */}
      <div className="relative px-3 pb-2">
        <Link
          href="/invoices/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-brand-500 to-brand-600 shadow-btn-brand hover:to-brand-700 transition-all hover:-translate-y-px"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 pt-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Workspace</p>
        {navigation.map((item) => (
          <NavLink key={item.name} item={item} active={isActive(item.href)} onClick={onNavigate} />
        ))}

        {session?.user?.role === 'admin' && (
          <>
            <p className="px-3 pt-6 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Admin</p>
            {adminNavigation.map((item) => (
              <NavLink key={item.name} item={item} active={isActive(item.href)} onClick={onNavigate} />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="relative border-t border-white/[0.06] px-3 py-3 space-y-1">
        <NavLink
          item={{ name: 'Settings', href: '/profile', icon: Settings }}
          active={isActive('/profile')}
          onClick={onNavigate}
        />
        {session?.user && (
          <div className="flex items-center gap-3 p-2.5 mt-2 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
            <div className="relative w-9 h-9 bg-gradient-to-br from-brand-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10">
              {session.user.name?.[0]?.toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-100 truncate">{session.user.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              aria-label="Sign out"
              className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        {!session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 z-40 flex-col">
      <SidebarContents />
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const drawer =
    mounted && open
      ? createPortal(
          <div className="lg:hidden fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 shadow-2xl flex flex-col animate-slide-in-left">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-h-0">
                <SidebarContents onNavigate={() => setOpen(false)} />
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_0_rgb(15_23_42/0.05)] hover:bg-slate-50"
      >
        <Menu className="w-5 h-5" />
      </button>
      {drawer}
    </>
  )
}
