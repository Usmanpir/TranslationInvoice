'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { Loader2 } from 'lucide-react'

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

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  )

  return (
    <div>
      <PageHeader title="Edit Quotation" description={quotation?.quotationNumber} />
      <div className="p-8">
        <InvoiceForm type="quotation" initialData={quotation} />
      </div>
    </div>
  )
}
