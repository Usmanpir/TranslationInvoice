import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { formatCurrency, formatDate } from '@/lib/utils'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: 40, backgroundColor: '#ffffff' },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 10 },
  logo: { maxWidth: 120, maxHeight: 48, objectFit: 'contain' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  row: { flexDirection: 'row', marginBottom: 16 },
  halfBox: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10 },
  gap: { width: 16 },
  boxLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  boxName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  boxText: { fontSize: 8, color: '#475569', lineHeight: 1.5 },
  boxBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', marginTop: 2 },
  metaBar: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaNumber: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  metaItem: { fontSize: 8, color: '#475569' },
  metaBold: { fontFamily: 'Helvetica-Bold', color: '#334155' },
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
  totalsWrap: { alignItems: 'flex-end', marginBottom: 16 },
  totalsBox: { width: 210, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  totLabel: { fontSize: 8.5, color: '#64748b' },
  totVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totGrand: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#0f172a' },
  totGrandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  totGrandVal: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  termsBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10, marginBottom: 14 },
  termsTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#334155', textTransform: 'uppercase', marginBottom: 6 },
  termsText: { fontSize: 8, color: '#475569', lineHeight: 1.6 },
  termsBold: { fontFamily: 'Helvetica-Bold' },
  footer: { textAlign: 'center', fontSize: 8, color: '#94a3b8', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
})

const DEFAULT_FOOTER = 'THANK YOU FOR YOUR TIME AND CONSIDERATION IN OUR SERVICE!'

function taxIdLabel(label: string) {
  return label === 'VAT' ? 'VAT TRN No.' : `${label} No.`
}

function InvoiceDocument({ doc, logo }: { doc: any; logo: string | null }) {
  const isQuotation = Boolean(doc.quotationNumber && !doc.invoiceNumber)
  const number = doc.invoiceNumber || doc.quotationNumber
  const docType = isQuotation ? 'Quotation' : 'Invoice'
  const issuer = doc.issuer ?? {}
  const customer = doc.customer
  const color = issuer.primaryColor || '#0070c7'
  const taxLabel = issuer.taxLabel || 'VAT'
  const fc = (v: number) => formatCurrency(v, doc.currency || 'AED')

  return (
    <Document title={`${docType} ${number}`} author={issuer.name}>
      <Page size="A4" style={s.page}>
        <View style={[s.accent, { backgroundColor: color }]} fixed />

        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logo && <Image src={logo} style={s.logo} />}
          <Text style={[s.companyName, { color }]}>{issuer.name || 'Company'}</Text>
        </View>

        <Text style={s.title}>{docType}</Text>

        <View style={s.row}>
          <View style={s.halfBox}>
            <Text style={[s.boxLabel, { color }]}>From:</Text>
            <Text style={s.boxName}>{issuer.name}</Text>
            {issuer.taxNumber && (
              <Text style={s.boxBold}>
                {taxIdLabel(taxLabel)} {issuer.taxNumber}
              </Text>
            )}
            {issuer.address && <Text style={s.boxText}>{issuer.address}</Text>}
            {issuer.phone && <Text style={s.boxText}>{issuer.phone}</Text>}
            {issuer.email && <Text style={s.boxText}>{issuer.email}</Text>}
            {issuer.website && <Text style={s.boxText}>{issuer.website}</Text>}
          </View>
          <View style={s.gap} />
          <View style={s.halfBox}>
            <Text style={[s.boxLabel, { color }]}>To:</Text>
            <Text style={s.boxName}>{customer?.name}</Text>
            {customer?.company && <Text style={s.boxText}>{customer.company}</Text>}
            {customer?.taxNumber && (
              <Text style={s.boxBold}>
                {taxLabel}: TRN:{customer.taxNumber}
              </Text>
            )}
            {customer?.address && <Text style={s.boxText}>{customer.address}</Text>}
            {customer?.phone && <Text style={s.boxText}>{customer.phone}</Text>}
            {customer?.email && <Text style={s.boxText}>{customer.email}</Text>}
          </View>
        </View>

        <View style={s.metaBar}>
          <Text style={s.metaNumber}>
            {docType} # {number}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {doc.completionDays && (
              <Text style={s.metaItem}>
                <Text style={s.metaBold}>Completion:</Text> {doc.completionDays}
              </Text>
            )}
            <Text style={s.metaItem}>
              <Text style={s.metaBold}>Date:</Text> {formatDate(doc.issueDate || doc.createdAt)}
            </Text>
            <Text style={s.metaItem}>
              <Text style={s.metaBold}>{isQuotation ? 'Valid Until:' : 'Due:'}</Text> {formatDate(isQuotation ? doc.validUntil : doc.dueDate)}
            </Text>
            {doc.salesperson && (
              <Text style={s.metaItem}>
                <Text style={s.metaBold}>Salesperson:</Text> {doc.salesperson}
              </Text>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tHead}>
            <View style={s.colCode}><Text style={s.th}>Code</Text></View>
            <View style={s.colDesc}><Text style={s.th}>Description</Text></View>
            <View style={s.colQty}><Text style={[s.th, { textAlign: 'center' }]}>Quantity</Text></View>
            <View style={s.colPrice}><Text style={[s.th, { textAlign: 'right' }]}>Unit Price</Text></View>
            <View style={s.colTax}><Text style={[s.th, { textAlign: 'center' }]}>Taxes</Text></View>
            <View style={s.colTotal}><Text style={[s.th, { textAlign: 'right', borderRightWidth: 0 }]}>Total Price</Text></View>
          </View>
          {doc.items?.map((item: any, i: number) => (
            <View key={i} style={s.tRow} wrap={false}>
              <View style={s.colCode}><Text style={s.td}>{item.code || '-'}</Text></View>
              <View style={s.colDesc}><Text style={s.td}>{item.description}</Text></View>
              <View style={s.colQty}><Text style={[s.td, { textAlign: 'center' }]}>{Number(item.quantity).toFixed(3)}</Text></View>
              <View style={s.colPrice}><Text style={[s.td, { textAlign: 'right' }]}>{fc(item.unitPrice)}</Text></View>
              <View style={s.colTax}>
                <Text style={[s.td, { textAlign: 'center', fontSize: 7.5 }]}>
                  {taxLabel} {doc.taxRate}%
                </Text>
              </View>
              <View style={s.colTotal}><Text style={[s.tdBold, { textAlign: 'right' }]}>{fc(item.total)}</Text></View>
            </View>
          ))}
        </View>

        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totalsBox}>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Subtotal{doc.taxInclusive ? ` (incl. ${taxLabel})` : ''}</Text>
              <Text style={s.totVal}>{fc(doc.subtotal)}</Text>
            </View>
            {doc.discount > 0 && (
              <View style={s.totRow}>
                <Text style={[s.totLabel, { color: '#16a34a' }]}>Discount ({doc.discount}%)</Text>
                <Text style={[s.totVal, { color: '#16a34a' }]}>-{fc(doc.discountAmount)}</Text>
              </View>
            )}
            <View style={s.totRow}>
              <Text style={s.totLabel}>
                {taxLabel} {doc.taxRate}%{doc.taxInclusive ? ' included' : ''}
              </Text>
              <Text style={s.totVal}>{fc(doc.taxAmount)}</Text>
            </View>
            <View style={s.totGrand}>
              <Text style={s.totGrandLabel}>Total</Text>
              <Text style={s.totGrandVal}>{fc(doc.total)}</Text>
            </View>
          </View>
        </View>

        {(issuer.bankName || issuer.paypalEmail || issuer.paymentInstructions) && (
          <View style={s.termsBox} wrap={false}>
            <Text style={s.termsTitle}>Terms</Text>
            {issuer.paymentInstructions && <Text style={[s.termsText, { marginBottom: 6 }]}>{issuer.paymentInstructions}</Text>}
            {issuer.bankName && (
              <View>
                <Text style={s.termsText}>
                  <Text style={s.termsBold}>PAYMENT METHOD:</Text> CASH | CHEQUE | BANK TRANSFER
                </Text>
                <Text style={[s.termsText, { marginTop: 4 }]}>
                  <Text style={s.termsBold}>TRANSFER DETAILS:</Text>
                </Text>
                <Text style={s.termsText}>
                  BANK NAME: <Text style={s.termsBold}>{issuer.bankName}</Text>
                </Text>
                {issuer.bankAccountName && (
                  <Text style={s.termsText}>
                    ACCOUNT BENEFICIARY: <Text style={s.termsBold}>{issuer.bankAccountName}</Text>
                  </Text>
                )}
                {(issuer.iban || issuer.bankAccountNumber) && (
                  <Text style={s.termsText}>
                    {[issuer.iban && `IBAN: ${issuer.iban}`, issuer.bankAccountNumber && `ACCOUNT NUMBER: ${issuer.bankAccountNumber}`, issuer.swiftCode && `SWIFT: ${issuer.swiftCode}`]
                      .filter(Boolean)
                      .join(' | ')}
                  </Text>
                )}
                {issuer.bankBranch && <Text style={s.termsText}>BRANCH: {issuer.bankBranch}</Text>}
                <Text style={s.termsText}>Currency: {doc.currency || 'AED'}</Text>
              </View>
            )}
            {issuer.paypalEmail && (
              <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <Text style={s.termsText}>
                  <Text style={s.termsBold}>PayPal:</Text> {issuer.paypalEmail}
                </Text>
              </View>
            )}
          </View>
        )}

        {doc.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Notes</Text>
            <Text style={{ fontSize: 8, color: '#64748b', lineHeight: 1.6 }}>{doc.notes}</Text>
          </View>
        )}

        <Text style={s.footer}>{issuer.invoiceFooter || DEFAULT_FOOTER}</Text>
      </Page>
    </Document>
  )
}

/** The logo is private (session-protected), so it is fetched with the session and embedded. */
async function loadLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return null
    const blob = await res.blob()
    // react-pdf renders PNG and JPEG only.
    if (!['image/png', 'image/jpeg'].includes(blob.type)) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateInvoicePDF(doc: any) {
  const logo = await loadLogo(doc.issuer?.logoUrl)
  const blob = await pdf(<InvoiceDocument doc={doc} logo={logo} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${doc.invoiceNumber || doc.quotationNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
