import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams
  return (
    <div>
      <PageHeader title="Create Quotation" description="Send a price quotation to your customer" />
      <div className="p-4 sm:p-6 lg:p-10">
        <InvoiceForm type="quotation" defaultCustomerId={customerId} />
      </div>
    </div>
  )
}
