-- Multi-tenant SaaS migration.
--
-- Data-preserving: every existing user becomes the OWNER of their own Organization,
-- their company/bank details move from "User" to "Organization", and all of their
-- customers, invoices, quotations and uploads are attached to that organization.
-- Users who had the old global role 'admin' become platform super admins.

-- ─────────────────────────── 1. Enums ───────────────────────────
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "BillingProviderId" AS ENUM ('NONE', 'STRIPE', 'MANUAL');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "UploadPurpose" AS ENUM ('PAYMENT_PROOF', 'LOGO');
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD', 'PAYPAL', 'OTHER');

-- ─────────────────────────── 2. New tables ───────────────────────────
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "country" TEXT NOT NULL DEFAULT 'AE',
    "logoUploadId" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0070c7',
    "taxNumber" TEXT,
    "taxLabel" TEXT NOT NULL DEFAULT 'VAT',
    "defaultTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "iban" TEXT,
    "swiftCode" TEXT,
    "paypalEmail" TEXT,
    "paymentInstructions" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'AED',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "quotationPrefix" TEXT NOT NULL DEFAULT 'QUO',
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "quotationNextNumber" INTEGER NOT NULL DEFAULT 1,
    "numberPadding" INTEGER NOT NULL DEFAULT 4,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "defaultNotes" TEXT,
    "invoiceFooter" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM dd, yyyy',
    "onboardingCompletedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'SALES',
    "notificationPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'SALES',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "provider" "BillingProviderId" NOT NULL DEFAULT 'NONE',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "BillingProviderId" NOT NULL,
    "providerRef" TEXT,
    "plan" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "BillingPaymentStatus" NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "provider" "BillingProviderId" NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "organizationId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "proofUrl" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- ─────────────────────────── 3. New columns (nullable for now) ───────────────────────────
ALTER TABLE "User"
    ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "emailVerified" TIMESTAMP(3),
    ADD COLUMN "lastOrganizationId" TEXT,
    ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
    ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'MMM dd, yyyy';

ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Invoice"
    ADD COLUMN "organizationId" TEXT,
    ADD COLUMN "paidAt" TIMESTAMP(3),
    ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation"
    ADD COLUMN "organizationId" TEXT,
    ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Upload"
    ADD COLUMN "organizationId" TEXT,
    ADD COLUMN "purpose" "UploadPurpose" NOT NULL DEFAULT 'PAYMENT_PROOF';

-- ─────────────────────────── 4. Backfill ───────────────────────────

-- One organization per existing user (id derived from the user id, so it is deterministic).
INSERT INTO "Organization" (
    "id", "name", "slug", "phone", "address", "taxNumber",
    "bankName", "bankBranch", "bankAccountName", "bankAccountNumber", "iban", "swiftCode", "paypalEmail",
    "email", "invoiceNextNumber", "quotationNextNumber", "onboardingCompletedAt", "createdAt", "updatedAt"
)
SELECT
    'org_' || u."id",
    COALESCE(NULLIF(TRIM(u."companyName"), ''), u."name" || '''s Business'),
    'org-' || LOWER(u."id"),
    u."phone", u."address", u."taxNumber",
    u."bankName", u."bankBranch", u."bankAccountName", u."bankAccountNumber", u."iban", u."swiftCode", u."paypalEmail",
    u."email",
    (SELECT COUNT(*) FROM "Invoice" i WHERE i."userId" = u."id") + 1,
    (SELECT COUNT(*) FROM "Quotation" q WHERE q."userId" = u."id") + 1,
    CURRENT_TIMESTAMP,   -- existing users skip onboarding
    u."createdAt",
    CURRENT_TIMESTAMP
FROM "User" u;

INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "createdAt", "updatedAt")
SELECT 'mem_' || u."id", u."id", 'org_' || u."id", 'OWNER', u."createdAt", CURRENT_TIMESTAMP
FROM "User" u;

-- Former global admins become platform super admins; their own workspace gets the top plan.
UPDATE "User" SET "isSuperAdmin" = ("role" = 'admin');
UPDATE "User" SET "lastOrganizationId" = 'org_' || "id";

INSERT INTO "Subscription" (
    "id", "organizationId", "plan", "status", "provider",
    "trialStart", "trialEnd", "currentPeriodStart", "createdAt", "updatedAt"
)
SELECT
    'sub_' || u."id",
    'org_' || u."id",
    CASE WHEN u."role" = 'admin' THEN 'business' ELSE 'professional' END,
    CASE WHEN u."role" = 'admin' THEN 'ACTIVE'::"SubscriptionStatus" ELSE 'TRIALING'::"SubscriptionStatus" END,
    CASE WHEN u."role" = 'admin' THEN 'MANUAL'::"BillingProviderId" ELSE 'NONE'::"BillingProviderId" END,
    CASE WHEN u."role" = 'admin' THEN NULL ELSE CURRENT_TIMESTAMP END,
    CASE WHEN u."role" = 'admin' THEN NULL ELSE CURRENT_TIMESTAMP + INTERVAL '14 days' END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u;

UPDATE "Customer"  SET "organizationId" = 'org_' || "userId";
UPDATE "Invoice"   SET "organizationId" = 'org_' || "userId";
UPDATE "Quotation" SET "organizationId" = 'org_' || "userId";
UPDATE "Upload"    SET "organizationId" = 'org_' || "userId";

-- Historical paid invoices: record paidAt and a payment entry so payment history is complete.
UPDATE "Invoice" SET "paidAt" = "updatedAt" WHERE "status" = 'PAID';

INSERT INTO "Payment" ("id", "organizationId", "invoiceId", "amount", "currency", "method", "proofUrl", "paidAt", "recordedById", "notes", "createdAt")
SELECT 'pay_' || i."id", i."organizationId", i."id", i."total", i."currency", 'OTHER', i."paymentProof", i."updatedAt", i."userId",
       'Imported from payment status before multi-tenant migration', CURRENT_TIMESTAMP
FROM "Invoice" i
WHERE i."status" = 'PAID';

-- Old admins could re-point an invoice to another user's customer. Report any such rows
-- (they keep the invoice creator's organization) so they can be reviewed after deploy.
DO $$
DECLARE mismatches INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatches
    FROM "Invoice" i JOIN "Customer" c ON c."id" = i."customerId"
    WHERE i."organizationId" <> c."organizationId";
    IF mismatches > 0 THEN
        RAISE WARNING 'multi_tenant_saas: % invoice(s) reference a customer from another organization', mismatches;
    END IF;
END $$;

-- ─────────────────────────── 5. Tighten constraints ───────────────────────────
ALTER TABLE "Customer"  ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Invoice"   ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Quotation" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Upload"    ALTER COLUMN "organizationId" SET NOT NULL;

-- Creator columns become optional: removing a user must never delete business data.
ALTER TABLE "Customer"  DROP CONSTRAINT "Customer_userId_fkey";
ALTER TABLE "Invoice"   DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_userId_fkey";
ALTER TABLE "Upload"    DROP CONSTRAINT "Upload_userId_fkey";
ALTER TABLE "Customer"  ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Invoice"   ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Quotation" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Upload"    ALTER COLUMN "userId" DROP NOT NULL;

-- Document numbers are unique per organization instead of globally.
DROP INDEX "Invoice_invoiceNumber_key";
DROP INDEX "Quotation_quotationNumber_key";

-- Company/bank details now live on Organization.
ALTER TABLE "User"
    DROP COLUMN "role",
    DROP COLUMN "companyName",
    DROP COLUMN "companyLogo",
    DROP COLUMN "address",
    DROP COLUMN "taxNumber",
    DROP COLUMN "bankName",
    DROP COLUMN "bankBranch",
    DROP COLUMN "bankAccountName",
    DROP COLUMN "bankAccountNumber",
    DROP COLUMN "iban",
    DROP COLUMN "swiftCode",
    DROP COLUMN "paypalEmail";

-- ─────────────────────────── 6. Indexes ───────────────────────────
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");
CREATE INDEX "Subscription_trialEnd_idx" ON "Subscription"("trialEnd");
CREATE UNIQUE INDEX "BillingPayment_providerRef_key" ON "BillingPayment"("providerRef");
CREATE INDEX "BillingPayment_organizationId_createdAt_idx" ON "BillingPayment"("organizationId", "createdAt");
CREATE UNIQUE INDEX "BillingEvent_eventId_key" ON "BillingEvent"("eventId");
CREATE INDEX "BillingEvent_organizationId_createdAt_idx" ON "BillingEvent"("organizationId", "createdAt");
CREATE INDEX "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Notification_organizationId_userId_createdAt_idx" ON "Notification"("organizationId", "userId", "createdAt");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
CREATE INDEX "Customer_organizationId_createdAt_idx" ON "Customer"("organizationId", "createdAt");
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");
CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");
CREATE INDEX "Invoice_organizationId_issueDate_idx" ON "Invoice"("organizationId", "issueDate");
CREATE INDEX "Invoice_organizationId_dueDate_idx" ON "Invoice"("organizationId", "dueDate");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE UNIQUE INDEX "Quotation_organizationId_quotationNumber_key" ON "Quotation"("organizationId", "quotationNumber");
CREATE INDEX "Quotation_organizationId_status_idx" ON "Quotation"("organizationId", "status");
CREATE INDEX "Quotation_organizationId_issueDate_idx" ON "Quotation"("organizationId", "issueDate");
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
CREATE INDEX "Upload_organizationId_idx" ON "Upload"("organizationId");

-- ─────────────────────────── 7. Foreign keys ───────────────────────────
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
