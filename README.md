# InvoiceFlow

Multi-tenant SaaS for quotations, VAT-ready invoices and payment tracking, built for UAE businesses.

Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS · PostgreSQL · Prisma · NextAuth (JWT) · Stripe · Resend · Vercel

---

## Architecture at a glance

| Concept | Where |
|---|---|
| **Tenancy** — every business is an `Organization`; users join through `Membership` (role). All tenant rows carry `organizationId`. | `prisma/schema.prisma` |
| **Request context** — `requireAuth()`, `requireOrganization({ permission, write })`, `requireSuperAdmin()`. Organization, role and plan come from the session + DB, never the client. | `src/lib/server/context.ts` |
| **Permissions** — `invoice.create`, `team.manage`, … mapped to roles Owner / Admin / Accountant / Sales / Viewer | `src/lib/permissions.ts` |
| **Plans, prices, limits, features** — the only place they are defined | `src/lib/plans.ts` |
| **Subscription & usage** — entitlements, trial expiry, `checkUsageLimit()`, `requireFeature()` | `src/lib/server/subscription.ts` |
| **Billing providers** — `BillingProvider` interface; Stripe + manual bank transfer | `src/lib/server/billing/` |
| **Email** — provider abstraction (Resend, console fallback) + templates | `src/lib/server/email/` |
| **API responses** — `{ success: true, data }` / `{ success: false, error: { code, message } }` | `src/lib/server/api.ts`, `src/lib/api-client.ts` |
| **Audit log, notifications, numbering, rate limiting** | `src/lib/server/*.ts` |
| **SaaS owner area** (`isSuperAdmin` users only) | `src/app/saas-admin`, `src/app/api/saas-admin` |

Document numbers are sequential per organization (`INV-2026-0001`), allocated inside a transaction and protected by a unique constraint.

---

## Local development

Requires Node 20+ and Docker.

```bash
# 1. Local Postgres
docker run -d --name invoiceflow-pg -e POSTGRES_USER=invoiceflow -e POSTGRES_PASSWORD=invoiceflow \
  -e POSTGRES_DB=invoiceflow -p 55432:5432 postgres:16-alpine

# 2. Environment
cp .env.example .env.local        # then fill NEXTAUTH_SECRET

# 3. Install, migrate, seed
npm install
npm run db:deploy:local           # or: npm run db:migrate (creates new migrations)
npm run db:seed

# 4. Run
npm run dev
```

`npm run db:*` scripts load **`.env.local`** explicitly so they can never hit the production database by accident.

### Seed accounts

| Account | Login |
|---|---|
| Platform admin | `ADMIN_EMAIL` / `ADMIN_PASSWORD` (random if unset — printed once) |
| Demo owner | `demo@invoiceflow.com` / `demo123456` |
| Demo sales | `sales@invoiceflow.com` / `demo123456` |
| Demo accountant | `accounts@invoiceflow.com` / `demo123456` |

The demo workspace blocks team, billing and settings changes, and the shared demo logins cannot change their password.

---

## Tests

```bash
npm test                          # unit tests (permissions, plans, entitlements, totals, CSV)
npm run dev -- -p 3100            # in another terminal
npm run test:integration          # API tests: auth, tenant isolation, roles, billing, invoices, quotations
```

Integration tests refuse to run unless `DATABASE_URL` points at `localhost`.

---

## Deploying to Vercel

1. Set the environment variables from `.env.example` (at minimum `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`).
2. **Back up the production database**, then apply migrations: `DATABASE_URL=<prod> npx prisma migrate deploy`.
   The `multi_tenant_saas` migration converts existing data: every existing user becomes the owner of their own organization, their company/bank details move to that organization, and former `admin` users become platform super admins. It prints a warning if any invoice references a customer from a different user.
3. Deploy. The build runs `prisma generate` automatically.
4. Stripe (optional): add a webhook endpoint `https://<domain>/api/billing/webhook/stripe` with the events listed in `.env.example`.
5. Vercel Cron calls `/api/cron/daily` once a day (trial reminders, trial expiry, overdue invoices, usage warnings).

---

## Legal pages

`/privacy`, `/terms` and `/refund-policy` contain professional **template** text and are clearly marked as drafts. Have them reviewed by a qualified legal professional before selling the product.
