import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 bg-white overflow-hidden">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-grid mask-radial" />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[radial-gradient(closest-side,rgb(12_143_233/0.14),transparent)]" />
      </div>
      <div className="relative text-center animate-fade-up">
        <Link href="/" className="inline-flex mb-10" aria-label="InvoiceFlow home">
          <Logo />
        </Link>
        <p className="font-display text-8xl sm:text-9xl font-extrabold tracking-tighter text-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary mt-8">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
