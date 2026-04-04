'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { Loader2 } from 'lucide-react'

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

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  )

  return (
    <div>
      <PageHeader title="Edit Invoice" description={invoice?.invoiceNumber} />
      <div className="p-8">
        <InvoiceForm type="invoice" initialData={invoice} />
      </div>
    </div>
  )
}
