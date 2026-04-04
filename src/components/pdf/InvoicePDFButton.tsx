'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface InvoicePDFButtonProps {
  invoice: any
}

export function InvoicePDFButton({ invoice }: InvoicePDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      // Dynamically import to avoid SSR issues
      const { generateInvoicePDF } = await import('./generateInvoicePDF')
      await generateInvoicePDF(invoice)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('PDF generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleDownload} disabled={loading} className="btn-secondary">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? 'Generating...' : 'Download PDF'}
    </button>
  )
}
