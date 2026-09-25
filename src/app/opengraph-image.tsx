import { ImageResponse } from 'next/og'

export const alt = 'InvoiceFlow — Create professional invoices. Get paid faster.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #020617 0%, #0b2a4a 55%, #312e81 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #36aaf8, #4f46e5)' }} />
          <div style={{ fontSize: 40, fontWeight: 700 }}>InvoiceFlow</div>
        </div>
        <div style={{ marginTop: 56, fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Create professional invoices.</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#7cc7fc' }}>Get paid faster.</div>
        <div style={{ marginTop: 36, fontSize: 30, color: '#cbd5e1' }}>VAT-ready invoicing & quotations for UAE businesses</div>
      </div>
    ),
    size
  )
}
