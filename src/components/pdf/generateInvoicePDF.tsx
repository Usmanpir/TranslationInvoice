import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CurrencyCode } from '@/lib/utils'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    padding: 40,
    backgroundColor: '#ffffff',
  },
  // Header
  centered: { textAlign: 'center', alignItems: 'center', marginBottom: 16 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0c8fe9', marginBottom: 2 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  // Two-column From/To
  row: { flexDirection: 'row', marginBottom: 16 },
  halfBox: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10 },
  gap: { width: 16 },
  boxLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  boxName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  boxText: { fontSize: 8, color: '#475569', lineHeight: 1.5 },
  boxBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', marginTop: 2 },
  // Meta bar
  metaBar: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaNumber: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  metaItem: { fontSize: 8, color: '#475569' },
  metaBold: { fontFamily: 'Helvetica-Bold', color: '#334155' },
  // Table
  table: { marginBottom: 16 },
  tHead: { flexDirection: 'row', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#334155', textTransform: 'uppercase', paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  td: { fontSize: 8.5, color: '#475569', paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  tdBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', paddingVertical: 6, paddingHorizontal: 8 },
  colCode: { width: 70 },
  colDesc: { flex: 1 },
  colQty: { width: 55, textAlign: 'center' },
  colPrice: { width: 65, textAlign: 'right' },
  colTax: { width: 65, textAlign: 'center' },
  colTotal: { width: 75, textAlign: 'right' },
  // Totals
  totalsWrap: { alignItems: 'flex-end', marginBottom: 16 },
  totalsBox: { width: 200, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  totLabel: { fontSize: 8.5, color: '#64748b' },
  totVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totGrand: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#0f172a' },
  totGrandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  totGrandVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  // Terms
  termsBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10, marginBottom: 14 },
  termsTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', textTransform: 'uppercase', marginBottom: 6 },
  termsText: { fontSize: 8, color: '#475569', lineHeight: 1.6 },
  termsBold: { fontFamily: 'Helvetica-Bold' },
  // Footer
  footer: { textAlign: 'center', fontSize: 8, color: '#94a3b8', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
})

function InvoiceDocument({ invoice }: { invoice: any }) {
  const isQuotation = invoice.quotationNumber !== undefined
  const docNumber = invoice.invoiceNumber || invoice.quotationNumber
  const docType = isQuotation ? 'Quotation' : 'Invoice'
  const cur = (invoice.currency || 'AED') as CurrencyCode
  const user = invoice.user
  const customer = invoice.customer
  const fc = (v: number) => formatCurrency(v, cur)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Company header */}
        <View style={s.centered}>
          <Text style={s.companyName}>{user?.companyName || user?.name || 'Company'}</Text>
        </View>

        {/* Title */}
        <Text style={s.title}>{docType}</Text>

        {/* From / To */}
        <View style={s.row}>
          <View style={s.halfBox}>
            <Text style={s.boxLabel}>From:</Text>
            <Text style={s.boxName}>{user?.companyName || user?.name}</Text>
            {user?.taxNumber && <Text style={s.boxBold}>VAT TRN No. {user.taxNumber}</Text>}
            {user?.address && <Text style={s.boxText}>{user.address}</Text>}
            {user?.phone && <Text style={s.boxText}>{user.phone}</Text>}
            {user?.email && <Text style={s.boxText}>{user.email}</Text>}
          </View>
          <View style={s.gap} />
          <View style={s.halfBox}>
            <Text style={s.boxLabel}>To:</Text>
            <Text style={s.boxName}>{customer?.name}</Text>
            {customer?.company && <Text style={s.boxText}>{customer.company}</Text>}
            {customer?.taxNumber && <Text style={s.boxBold}>VAT: TRN:{customer.taxNumber}</Text>}
            {customer?.address && <Text style={s.boxText}>{customer.address}</Text>}
            {customer?.phone && <Text style={s.boxText}>{customer.phone}</Text>}
            {customer?.email && <Text style={s.boxText}>{customer.email}</Text>}
          </View>
        </View>

        {/* Meta bar */}
        <View style={s.metaBar}>
          <Text style={s.metaNumber}>{docType} # {docNumber}</Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {invoice.completionDays && (
              <Text style={s.metaItem}><Text style={s.metaBold}>Completion:</Text> {invoice.completionDays}</Text>
            )}
            <Text style={s.metaItem}><Text style={s.metaBold}>Date:</Text> {formatDate(invoice.issueDate || invoice.createdAt)}</Text>
            <Text style={s.metaItem}>
              <Text style={s.metaBold}>{isQuotation ? 'Valid Until:' : 'Due:'}</Text> {formatDate(invoice.dueDate || invoice.validUntil)}
            </Text>
            {invoice.salesperson && (
              <Text style={s.metaItem}><Text style={s.metaBold}>Salesperson:</Text> {invoice.salesperson}</Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={s.table}>
          <View style={s.tHead}>
            <View style={[s.colCode]}><Text style={s.th}>Code</Text></View>
            <View style={[s.colDesc]}><Text style={s.th}>Description</Text></View>
            <View style={[s.colQty]}><Text style={[s.th, { textAlign: 'center' }]}>Quantity</Text></View>
            <View style={[s.colPrice]}><Text style={[s.th, { textAlign: 'right' }]}>Unit Price</Text></View>
            <View style={[s.colTax]}><Text style={[s.th, { textAlign: 'center' }]}>Taxes</Text></View>
            <View style={[s.colTotal]}><Text style={[s.th, { textAlign: 'right', borderRightWidth: 0 }]}>Total Price</Text></View>
          </View>
          {invoice.items?.map((item: any, i: number) => (
            <View key={i} style={s.tRow}>
              <View style={[s.colCode]}><Text style={s.td}>{item.code || '-'}</Text></View>
              <View style={[s.colDesc]}><Text style={s.td}>{item.description}</Text></View>
              <View style={[s.colQty]}><Text style={[s.td, { textAlign: 'center' }]}>{item.quantity.toFixed(3)}</Text></View>
              <View style={[s.colPrice]}><Text style={[s.td, { textAlign: 'right' }]}>{fc(item.unitPrice)}</Text></View>
              <View style={[s.colTax]}><Text style={[s.td, { textAlign: 'center', fontSize: 7.5 }]}>VAT {invoice.taxRate}%</Text></View>
              <View style={[s.colTotal]}><Text style={[s.tdBold, { textAlign: 'right' }]}>{fc(item.total)}</Text></View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Subtotal</Text>
              <Text style={s.totVal}>{fc(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={s.totRow}>
                <Text style={[s.totLabel, { color: '#16a34a' }]}>Discount ({invoice.discount}%)</Text>
                <Text style={[s.totVal, { color: '#16a34a' }]}>-{fc(invoice.discountAmount)}</Text>
              </View>
            )}
            <View style={s.totRow}>
              <Text style={s.totLabel}>VAT {invoice.taxRate}%</Text>
              <Text style={s.totVal}>{fc(invoice.taxAmount)}</Text>
            </View>
            {user?.taxNumber && (
              <View style={{ paddingHorizontal: 10, paddingBottom: 2 }}>
                <Text style={{ fontSize: 6.5, color: '#94a3b8' }}>{user.taxNumber}</Text>
              </View>
            )}
            <View style={s.totGrand}>
              <Text style={s.totGrandLabel}>Total</Text>
              <Text style={s.totGrandVal}>{fc(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Terms */}
        {(user?.bankName || user?.paypalEmail) && (
          <View style={s.termsBox}>
            <Text style={s.termsTitle}>Terms</Text>
            {user?.bankName && (
              <View>
                <Text style={s.termsText}><Text style={s.termsBold}>PAYMENT METHOD:</Text> CASH | CHEQUE | BANK TRANSFER</Text>
                <Text style={[s.termsText, { marginTop: 4 }]}><Text style={s.termsBold}>TRANSFER DETAILS:</Text></Text>
                <Text style={s.termsText}>BANK NAME: <Text style={s.termsBold}>{user.bankName}</Text></Text>
                {user.bankAccountName && <Text style={s.termsText}>ACCOUNT BENEFICIARY: <Text style={s.termsBold}>{user.bankAccountName}</Text></Text>}
                {user.iban && <Text style={s.termsText}>IBAN: {user.iban}{user.bankAccountNumber ? ` | ACCOUNT NUMBER: ${user.bankAccountNumber}` : ''}{user.swiftCode ? ` | SWIFT: ${user.swiftCode}` : ''}</Text>}
                {user.bankBranch && <Text style={s.termsText}>BRANCH: {user.bankBranch}</Text>}
                <Text style={s.termsText}>Currency: {invoice.currency || 'AED'}</Text>
              </View>
            )}
            {user?.paypalEmail && (
              <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <Text style={s.termsText}><Text style={s.termsBold}>Paypal:</Text></Text>
                <Text style={s.termsText}>PAYPAL ID: {user.paypalEmail}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Notes</Text>
            <Text style={{ fontSize: 8, color: '#64748b', lineHeight: 1.6 }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>THANK YOU FOR YOUR TIME AND CONSIDERATION IN OUR SERVICE!</Text>
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
