'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { EmptyState, PageLoader } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>()
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/invoices/${params.id}`)
      .then(setRecord)
      .catch((e) => setError(errorMessage(e, 'Could not load this invoice.')))
  }, [params.id])

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={Receipt}
          title="Invoice not available"
          description={error}
          action={<Link href="/invoices" className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</Link>}
        />
      </div>
    )
  }
  if (!record) return <PageLoader label="Loading invoice…" />

  return (
    <div>
      <PageHeader title="Edit Invoice" description={record.invoiceNumber} />
      <div className="p-4 sm:p-6 lg:p-10">
        <InvoiceForm type="invoice" initialData={record} />
      </div>
    </div>
  )
}
