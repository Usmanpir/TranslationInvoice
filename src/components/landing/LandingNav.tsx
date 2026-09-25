'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How it works', href: '/#workflow' },
  { label: 'FAQ', href: '/#faq' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4 pt-3">
      <nav
        className={cn(
          'mx-auto max-w-6xl flex items-center justify-between gap-4 h-14 pl-4 pr-2 rounded-2xl transition-all duration-300',
          scrolled || open
            ? 'bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-slate-200/70 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.18)]'
            : 'border border-transparent'
        )}
      >
        <Link href="/" aria-label="InvoiceFlow home">
          <Logo markClassName="w-8 h-8 rounded-[10px]" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-900/[0.04] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="btn-ghost h-10 px-3.5 text-slate-700">
            Sign in
          </Link>
          <Link href="/register" className="btn-dark group">
            Start free trial
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden icon-btn w-10 h-10 text-slate-700"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden mx-auto max-w-6xl mt-2 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-elevated animate-scale-in">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="grid grid-cols-2 gap-2 p-2 pt-3 mt-1 border-t border-slate-100">
            <Link href="/login" className="btn-secondary">Sign in</Link>
            <Link href="/register" className="btn-primary">Start free trial</Link>
          </div>
        </div>
      )}
    </header>
  )
}
