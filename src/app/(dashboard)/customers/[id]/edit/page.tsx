'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { Loader2 } from 'lucide-react'

export default function EditCustomerPage() {
  const params = useParams()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  )

  return (
    <div>
      <PageHeader title="Edit Customer" description={`Updating ${customer?.name}`} />
      <div className="p-4 sm:p-6 lg:p-8">
        <CustomerForm initialData={customer} />
      </div>
    </div>
  )
}
