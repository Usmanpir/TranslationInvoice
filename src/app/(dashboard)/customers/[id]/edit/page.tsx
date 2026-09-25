'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { PageLoader } from '@/components/ui/States'

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

  if (loading) return <PageLoader label="Loading customer…" />

  return (
    <div>
      <PageHeader title="Edit Customer" description={`Updating ${customer?.name}`} />
      <div className="p-4 sm:p-6 lg:p-10">
        <CustomerForm initialData={customer} />
      </div>
    </div>
  )
}
