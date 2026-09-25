-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "completionDays" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'AED',
ADD COLUMN     "salesperson" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "completionDays" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'AED',
ADD COLUMN     "salesperson" TEXT;

-- AlterTable
ALTER TABLE "QuotationItem" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "paypalEmail" TEXT,
ADD COLUMN     "swiftCode" TEXT;
