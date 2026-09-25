'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { EmptyState, PageLoader } from '@/components/ui/States'
import { api, errorMessage } from '@/lib/api-client'

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>()
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/customers/${params.id}`)
      .then(setRecord)
      .catch((e) => setError(errorMessage(e, 'Could not load this customer.')))
  }, [params.id])

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          icon={Users}
          title="Customer not available"
          description={error}
          action={<Link href="/customers" className="btn-secondary"><ArrowLeft className="w-4 h-4" />Back</Link>}
        />
      </div>
    )
  }
  if (!record) return <PageLoader label="Loading customer…" />

  return (
    <div>
      <PageHeader title="Edit Customer" description={`Updating ${record.name}`} />
      <div className="p-4 sm:p-6 lg:p-10">
        <CustomerForm initialData={record} />
      </div>
    </div>
  )
}
