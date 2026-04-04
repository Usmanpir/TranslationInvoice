import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  pdf,
  Font,
} from '@react-pdf/renderer'
import { formatCurrency, formatDate } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
    padding: 48,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 36,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0c8fe9',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  invoiceMeta: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 1.6,
  },
  statusBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 8,
    color: '#16a34a',
    fontFamily: 'Helvetica-Bold',
  },
  billToSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  billToName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  billToInfo: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.6,
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'right' },
  colPrice: { width: 80, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  thText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tdText: { fontSize: 9.5, color: '#334155' },
  tdBold: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totalsSection: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 9.5, color: '#64748b' },
  totalValue: { fontSize: 9.5, color: '#334155' },
  totalLineLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totalLineValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0c8fe9' },
  divider: { borderTopWidth: 2, borderTopColor: '#0f172a', marginVertical: 6 },
  lightDivider: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginVertical: 3 },
  notes: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  notesText: { fontSize: 9, color: '#64748b', lineHeight: 1.6 },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#94a3b8' },
})

function statusColor(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    PAID: { bg: '#f0fdf4', text: '#16a34a' },
    PENDING: { bg: '#fffbeb', text: '#d97706' },
    OVERDUE: { bg: '#fef2f2', text: '#dc2626' },
    CANCELLED: { bg: '#f8fafc', text: '#64748b' },
  }
  return map[status] || map.PENDING
}

function InvoiceDocument({ invoice }: { invoice: any }) {
  const sc = statusColor(invoice.status)
  const isQuotation = invoice.quotationNumber !== undefined

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{invoice.user?.companyName || invoice.user?.name || 'Company Name'}</Text>
            {invoice.user?.address && <Text style={styles.companyInfo}>{invoice.user.address}</Text>}
            {invoice.user?.phone && <Text style={styles.companyInfo}>{invoice.user.phone}</Text>}
            {invoice.user?.email && <Text style={styles.companyInfo}>{invoice.user.email}</Text>}
            {invoice.user?.taxNumber && <Text style={styles.companyInfo}>Tax: {invoice.user.taxNumber}</Text>}
          </View>
          <View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg, alignSelf: 'flex-end' }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{invoice.status}</Text>
            </View>
            <Text style={styles.invoiceTitle}>{invoice.invoiceNumber || invoice.quotationNumber}</Text>
            <Text style={styles.invoiceMeta}>
              Issued: {formatDate(invoice.issueDate || invoice.createdAt)}{'\n'}
              {isQuotation ? 'Valid Until: ' : 'Due: '}{formatDate(invoice.dueDate || invoice.validUntil)}
            </Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.sectionLabel}>{isQuotation ? 'Quote For' : 'Bill To'}</Text>
          <Text style={styles.billToName}>{invoice.customer?.name}</Text>
          {invoice.customer?.company && <Text style={styles.billToInfo}>{invoice.customer.company}</Text>}
          {invoice.customer?.email && <Text style={styles.billToInfo}>{invoice.customer.email}</Text>}
          {invoice.customer?.phone && <Text style={styles.billToInfo}>{invoice.customer.phone}</Text>}
          {invoice.customer?.address && <Text style={styles.billToInfo}>{invoice.customer.address}</Text>}
          {invoice.customer?.taxNumber && <Text style={styles.billToInfo}>Tax ID: {invoice.customer.taxNumber}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}><Text style={styles.thText}>Description</Text></View>
            <View style={styles.colQty}><Text style={styles.thText}>Qty</Text></View>
            <View style={styles.colPrice}><Text style={styles.thText}>Unit Price</Text></View>
            <View style={styles.colTotal}><Text style={styles.thText}>Total</Text></View>
          </View>
          {invoice.items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colDesc}><Text style={styles.tdText}>{item.description}</Text></View>
              <View style={styles.colQty}><Text style={styles.tdText}>{item.quantity}</Text></View>
              <View style={styles.colPrice}><Text style={styles.tdText}>{formatCurrency(item.unitPrice)}</Text></View>
              <View style={styles.colTotal}><Text style={styles.tdBold}>{formatCurrency(item.total)}</Text></View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>Discount ({invoice.discount}%)</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>-{formatCurrency(invoice.discountAmount)}</Text>
              </View>
            )}
            {invoice.taxRate > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalLineLabel}>Total Due</Text>
              <Text style={styles.totalLineValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by InvoiceFlow</Text>
          <Text style={styles.footerText}>{invoice.invoiceNumber || invoice.quotationNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(invoice: any) {
  const doc = <InvoiceDocument invoice={invoice} />
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${invoice.invoiceNumber || invoice.quotationNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
