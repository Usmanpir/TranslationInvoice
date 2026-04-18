'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, LayoutDashboard, Users, Receipt, FileQuestion, LogOut, Settings, ShieldCheck, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
        active
          ? 'text-white bg-white/10'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-brand-500 rounded-r-full" aria-hidden />
      )}
      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="flex-1 truncate">{item.name}</span>
    </Link>
  )
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-300">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
            <FileText className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-[15px] font-semibold text-white tracking-tight leading-none">InvoiceFlow</span>
            {session?.user?.companyName && (
              <p className="text-[11px] text-slate-500 truncate mt-1 max-w-[150px]">{session.user.companyName}</p>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Workspace</p>
        {navigation.map((item) => (
          <NavLink key={item.name} item={item} active={isActive(item.href)} onClick={onNavigate} />
        ))}

        {session?.user?.role === 'admin' && (
          <>
            <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Admin</p>
            {adminNavigation.map((item) => (
              <NavLink key={item.name} item={item} active={isActive(item.href)} onClick={onNavigate} />
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 px-3 py-3 space-y-0.5">
        <Link
          href="/profile"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            isActive('/profile')
              ? 'text-white bg-white/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl bg-white/5">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {session.user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{session.user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{session.user.email}</p>
            </div>
          </div>
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 shadow-2xl flex flex-col">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
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
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      >
        <Menu className="w-5 h-5" />
      </button>
      {drawer}
    </>
  )
}
