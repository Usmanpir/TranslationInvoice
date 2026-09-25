'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, Sparkles } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Alert } from '@/components/ui/States'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = async () => {
    setEmail('demo@invoiceflow.com')
    setPassword('demo123456')
    setLoading(true)
    const result = await signIn('credentials', {
      email: 'demo@invoiceflow.com',
      password: 'demo123456',
      redirect: false,
    })
    if (result?.error) {
      setError('Demo login failed. Please seed the database first.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label" htmlFor="email">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input h-11 pl-10"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input h-11 pl-10 pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full h-11 group">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Sign in
          {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs font-medium text-slate-400 bg-white">or</span>
        </div>
      </div>

      <button onClick={handleDemo} disabled={loading} className="btn-secondary w-full h-11">
        <Sparkles className="w-4 h-4 text-brand-500" />
        Try Demo Account
      </button>

      <p className="text-center text-sm text-slate-500 mt-8">
        Don't have an account?{' '}
        <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}
