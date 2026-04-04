import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'

export default function NewQuotationPage() {
  return (
    <div>
      <PageHeader title="Create Quotation" description="Send a price quotation to your customer" />
      <div className="p-8">
        <InvoiceForm type="quotation" />
      </div>
    </div>
  )
}
