'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { PageLoader } from '@/components/ui/States'

export default function EditInvoicePage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((r) => r.json())
      .then(setInvoice)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <PageLoader label="Loading invoice…" />

  return (
    <div>
      <PageHeader title="Edit Invoice" description={invoice?.invoiceNumber} />
      <div className="p-4 sm:p-6 lg:p-10">
        <InvoiceForm type="invoice" initialData={invoice} />
      </div>
    </div>
  )
}
