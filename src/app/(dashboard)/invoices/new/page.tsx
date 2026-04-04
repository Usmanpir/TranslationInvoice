import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'

export default function NewInvoicePage() {
  return (
    <div>
      <PageHeader title="Create Invoice" description="Generate a new invoice for your customer" />
      <div className="p-8">
        <InvoiceForm type="invoice" />
      </div>
    </div>
  )
}
