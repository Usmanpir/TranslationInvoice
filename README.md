# InvoiceFlow 🧾

A complete full-stack **Bills, Invoices & Quotations Management** application built with Next.js 15, PostgreSQL, Prisma ORM, and Tailwind CSS.

---

## ✨ Features

- **Authentication** — Register, login, logout with JWT sessions (NextAuth)
- **Dashboard** — Revenue stats, paid/pending/overdue summaries, recent invoices
- **Customer Management** — Add, edit, delete customers with search & pagination
- **Invoice Management** — Create, edit, delete invoices with line items, tax, discount
- **Mark as Paid/Unpaid** — One-click status toggle
- **Quotation Management** — Create quotations, convert them to invoices
- **PDF Download** — Professional PDF export with company info, itemized table, totals
- **Search & Filter** — Search by invoice number/customer, filter by status
- **Pagination** — All list pages support pagination
- **Unique Invoice Numbers** — Auto-generated (INV-2024-XXXXX format)
- **Profile/Settings** — Update company name, address, tax number for PDF headers

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (JWT) |
| Styling | Tailwind CSS |
| PDF | @react-pdf/renderer |
| Validation | Zod |
| Forms | React Hook Form |

---

## 📦 Project Structure

```
invoiceflow/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Sample data
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Protected layout group
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── customers/     # Customer CRUD pages
│   │   │   ├── invoices/      # Invoice CRUD + detail pages
│   │   │   ├── quotations/    # Quotation CRUD pages
│   │   │   └── profile/       # Settings page
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth + register endpoints
│   │   │   ├── customers/     # Customer REST API
│   │   │   ├── invoices/      # Invoice REST API
│   │   │   ├── quotations/    # Quotation REST API
│   │   │   ├── dashboard/     # Dashboard stats API
│   │   │   └── profile/       # User profile API
│   │   ├── login/             # Login page
│   │   └── register/          # Register page
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx    # Navigation sidebar
│   │   ├── ui/
│   │   │   ├── StatusBadge.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── forms/
│   │   │   ├── CustomerForm.tsx
│   │   │   └── InvoiceForm.tsx  # Used for both invoices & quotations
│   │   └── pdf/
│   │       ├── InvoicePDFButton.tsx
│   │       └── generateInvoicePDF.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts           # Helpers, formatters, calculators
│   └── types/
│       └── next-auth.d.ts     # Session type augmentation
├── .env.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** 18.17+ ([download](https://nodejs.org))
- **PostgreSQL** 14+ running locally ([download](https://www.postgresql.org/download/))

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/invoiceflow.git
cd invoiceflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/invoiceflow"
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Generate a secure secret:**
> ```bash
> openssl rand -base64 32
> ```

### 4. Create the database

In PostgreSQL:
```sql
CREATE DATABASE invoiceflow;
```

Or with psql:
```bash
psql -U postgres -c "CREATE DATABASE invoiceflow;"
```

### 5. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed sample data (optional)

```bash
npm run db:seed
```

This creates:
- Demo account: `demo@invoiceflow.com` / `demo123456`
- 3 sample customers
- 3 invoices (paid, pending, overdue)
- 1 quotation

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🗄️ Database Schema

```
Users
├── id, name, email, password (hashed)
├── companyName, address, phone, taxNumber
└── → Customers, Invoices, Quotations

Customers
├── id, name, email, phone, address
├── company, taxNumber
└── userId (FK → Users)

Invoices
├── id, invoiceNumber (unique), status
├── issueDate, dueDate, notes
├── taxRate, discount, subtotal, taxAmount, discountAmount, total
├── userId (FK → Users)
├── customerId (FK → Customers)
└── → InvoiceItems

InvoiceItems
├── id, description, quantity, unitPrice, total
└── invoiceId (FK → Invoices)

Quotations
├── id, quotationNumber (unique), status
├── issueDate, validUntil, notes
├── taxRate, discount, subtotal, taxAmount, discountAmount, total
├── convertedToInvoice (boolean)
├── userId (FK → Users)
├── customerId (FK → Customers)
└── → QuotationItems

QuotationItems
├── id, description, quantity, unitPrice, total
└── quotationId (FK → Quotations)
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/signin` | Sign in (NextAuth) |
| POST | `/api/auth/signout` | Sign out |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers (+ search, pagination) |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Get customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (+ search, status filter, pagination) |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/:id` | Get invoice with items |
| PUT | `/api/invoices/:id` | Update invoice / change status |
| DELETE | `/api/invoices/:id` | Delete invoice |

### Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotations` | List quotations |
| POST | `/api/quotations` | Create quotation |
| GET | `/api/quotations/:id` | Get quotation |
| PUT | `/api/quotations/:id` | Update / convert to invoice (`{ action: "convert" }`) |
| DELETE | `/api/quotations/:id` | Delete quotation |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats + recent invoices |

---

## ☁️ Deployment

### Option A: Vercel (Recommended)

**1. Set up database (Neon - free PostgreSQL)**

1. Go to [neon.tech](https://neon.tech), create a free account
2. Create a new project → copy the connection string

**2. Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo at vercel.com
```

**3. Add environment variables in Vercel dashboard:**

```
DATABASE_URL=postgresql://...  (from Neon)
NEXTAUTH_SECRET=your-32-char-secret
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**4. Run migrations on production:**

```bash
# One-time: run from local with production DATABASE_URL
DATABASE_URL="your-prod-url" npx prisma migrate deploy
DATABASE_URL="your-prod-url" npm run db:seed
```

---

### Option B: Self-hosted (VPS / Docker)

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: invoiceflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:secret@postgres:5432/invoiceflow
      NEXTAUTH_SECRET: your-secret
      NEXTAUTH_URL: http://localhost:3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  pgdata:
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

---

## 🔑 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations (dev)
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:seed      # Seed sample data
```

---

## 🧪 Demo Credentials

After seeding:
- **Email:** `demo@invoiceflow.com`
- **Password:** `demo123456`

---

## 📋 UI Pages

| Page | Route |
|------|-------|
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Customers List | `/customers` |
| Add Customer | `/customers/new` |
| Edit Customer | `/customers/:id/edit` |
| Invoices List | `/invoices` |
| Create Invoice | `/invoices/new` |
| Invoice Detail | `/invoices/:id` |
| Edit Invoice | `/invoices/:id/edit` |
| Quotations List | `/quotations` |
| Create Quotation | `/quotations/new` |
| Edit Quotation | `/quotations/:id/edit` |
| Settings | `/profile` |
