import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

export const BASE = process.env.TEST_BASE_URL || 'http://localhost:3100'

const dbUrl = process.env.DATABASE_URL || ''
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl) && process.env.TEST_ALLOW_REMOTE_DB !== 'true') {
  throw new Error('Integration tests only run against a local database (DATABASE_URL must point at localhost).')
}

export const prisma = new PrismaClient()

/** Minimal cookie-aware HTTP client that signs in through NextAuth like a browser. */
export class Client {
  private cookies = new Map<string, string>()

  private store(res: Response) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1))
    }
  }

  async req<T = any>(path: string, opts: { method?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string> } = {}) {
    const res = await fetch(BASE + path, {
      method: opts.method ?? (opts.json !== undefined || opts.body ? 'POST' : 'GET'),
      redirect: 'manual',
      headers: {
        ...(opts.headers ?? {}),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(opts.json !== undefined && { 'content-type': 'application/json' }),
      },
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    })
    this.store(res)
    const text = await res.text()
    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
    return { status: res.status, json: json as { success: boolean; data: T; error: { code: string; message: string; details?: any } } }
  }

  async login(email: string, password: string) {
    const csrf = await this.req('/api/auth/csrf')
    const body = new URLSearchParams({ csrfToken: (csrf.json as any).csrfToken, email, password, json: 'true' })
    const res = await this.req('/api/auth/callback/credentials', { body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    const session = await this.req('/api/auth/session')
    if (!(session.json as any)?.user) throw new Error(`login failed for ${email} (status ${res.status})`)
    return this
  }
}

export const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

/** Test-only: reset the signup throttle so suites can create many workspaces. */
export async function resetSignupThrottle() {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: 'register:' } } })
}

export async function registerOrg(label: string, extra: Record<string, unknown> = {}) {
  await resetSignupThrottle()
  const email = `${label}.${stamp()}@test.local`
  const password = 'secret123'
  const c = new Client()
  const r = await c.req('/api/auth/register', { json: { name: `${label} Owner`, email, password, companyName: `${label} Co`, currency: 'AED', ...extra } })
  if (!r.json.success) throw new Error(`register failed: ${JSON.stringify(r.json)}`)
  await c.login(email, password)
  return { client: c, email, password, organizationId: (r.json.data as any).organization.id as string }
}

/** Creates a member with a given role directly in the DB (fast path for role tests). */
export async function addMember(organizationId: string, role: 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'VIEWER') {
  const email = `${role.toLowerCase()}.${stamp()}@test.local`
  const user = await prisma.user.create({
    data: { email, name: `${role} User`, password: await bcrypt.hash('secret123', 12), lastOrganizationId: organizationId },
  })
  await prisma.membership.create({ data: { userId: user.id, organizationId, role } })
  return new Client().login(email, 'secret123')
}

export async function superAdmin() {
  const email = `root.${stamp()}@test.local`
  await prisma.user.create({ data: { email, name: 'Root', password: await bcrypt.hash('secret123', 12), isSuperAdmin: true } })
  return new Client().login(email, 'secret123')
}

export const invoiceBody = (customerId: string, extra: Record<string, unknown> = {}) => ({
  customerId,
  dueDate: '2030-01-01',
  currency: 'AED',
  taxRate: 5,
  discount: 0,
  items: [{ description: 'Consulting', quantity: 2, unitPrice: 100 }],
  ...extra,
})
