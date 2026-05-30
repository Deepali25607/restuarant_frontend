import { QRCodeCanvas } from 'qrcode.react'
import { Printer, X } from 'lucide-react'

// Full-screen printable grid of QR codes for every table. Renders inside the
// app (no popup) and relies on the `.print-sheet` CSS rules in index.css to
// hide everything else when the user prints.
export default function BulkQrSheet({ tables, orgSlug, orgName, customerOrigin, onClose }) {
  return (
    <div className="print-sheet fixed inset-0 z-[60] overflow-y-auto">
      <div
        data-print-hide
        className="sticky top-0 z-10 bg-white border-b border-saffron-200 px-6 py-3 flex items-center justify-between gap-3"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-saffron-700">
            {orgName || 'Restaurant'}
          </div>
          <div className="font-display text-lg">QR sheet · {tables.length} {tables.length === 1 ? 'table' : 'tables'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-curry-gradient text-white px-4 py-2 text-sm font-semibold shadow-warm"
          >
            <Printer className="h-4 w-4" /> Print sheet
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300 text-saffron-700 px-3 py-2 text-sm font-semibold hover:bg-saffron-50"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl">{orgName || 'Scan to order'}</h1>
          <p className="text-sm mt-1 opacity-70">
            Scan the QR at your table to view the menu and place your order.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {tables.map((t) => {
            const url = `${customerOrigin}/order/${orgSlug}/${t.number}`
            return (
              <div
                key={t.number}
                className="border border-black/20 rounded-2xl p-4 flex flex-col items-center text-center break-inside-avoid"
                style={{ pageBreakInside: 'avoid' }}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] opacity-70">Table</div>
                <div className="font-display text-4xl leading-none mt-0.5">{t.number}</div>
                <div className="mt-3">
                  <QRCodeCanvas value={url} size={170} level="M" includeMargin />
                </div>
                <div className="text-[10px] mt-2 break-all opacity-70 font-mono">
                  {url}
                </div>
                <div className="text-[10px] mt-1 opacity-70">
                  Seats: {t.seats}
                </div>
              </div>
            )
          })}
        </div>

        {tables.length === 0 && (
          <div className="text-center text-sm opacity-70 py-12">
            No tables to print yet. Add at least one table first.
          </div>
        )}
      </div>
    </div>
  )
}
