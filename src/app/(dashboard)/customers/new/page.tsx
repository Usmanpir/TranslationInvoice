import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/forms/CustomerForm'

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="Add Customer" description="Create a new customer record" />
      <div className="p-4 sm:p-6 lg:p-8">
        <CustomerForm />
      </div>
    </div>
  )
}
