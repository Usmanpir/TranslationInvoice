'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { PageLoader } from '@/components/ui/States'

export default function EditQuotationPage() {
  const params = useParams()
  const [quotation, setQuotation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/quotations/${params.id}`)
      .then((r) => r.json())
      .then(setQuotation)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <PageLoader label="Loading quotation…" />

  return (
    <div>
      <PageHeader title="Edit Quotation" description={quotation?.quotationNumber} />
      <div className="p-4 sm:p-6 lg:p-10">
        <InvoiceForm type="quotation" initialData={quotation} />
      </div>
    </div>
  )
}
