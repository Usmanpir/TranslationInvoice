'use client'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8 text-center animate-scale-in">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 ring-1 ring-inset ring-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="mt-5 font-display text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred while loading this page. Please try again.
        </p>
        {error?.digest && <p className="mt-3 font-mono text-[11px] text-slate-400">Ref: {error.digest}</p>}
        <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button onClick={reset} className="btn-primary">
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
