import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { BedDouble, Plus, X, Trash2, Download, QrCode, AlertTriangle, Printer } from 'lucide-react'
import clsx from 'clsx'
import { fetchRooms, createRoom, deleteRoom } from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'
import BulkQrSheet from '../../components/admin/BulkQrSheet'

// QR codes must point at the app's public root *including* the deploy sub-path
// (e.g. https://nexussoftlab.com/OrderNow), so scanned links land in-app rather
// than at the bare domain. BASE_URL is "/OrderNow/" in prod, "/" in dev.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const customerOrigin =
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5180') +
  basePath

export default function AdminRooms() {
  const orgSlug = useAuthStore((s) => s.user?.organization?.slug || '')
  const orgName = useAuthStore((s) => s.user?.organization?.name || '')
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [qrRoom, setQrRoom] = useState(null)
  const [bulkSheet, setBulkSheet] = useState(false)

  useEffect(() => {
    let alive = true
    fetchRooms()
      .then((d) => alive && setRooms(d))
      .catch((e) => alive && setError(e?.response?.data?.message || e.message))
    return () => {
      alive = false
    }
  }, [])

  const refresh = async () => {
    try {
      setRooms(await fetchRooms())
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const create = async (e) => {
    e?.preventDefault()
    if (!newNumber.trim()) return
    try {
      const r = await createRoom({ number: newNumber.trim() })
      setRooms((prev) => [...prev, r])
      setAdding(false)
      setNewNumber('')
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    }
  }

  const remove = async (room) => {
    if (!confirm(`Delete Room ${room.number}?`)) return
    try {
      await deleteRoom(room.number)
      setRooms((prev) => prev.filter((r) => r.number !== room.number))
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow">
            <BedDouble className="h-3.5 w-3.5" /> Rooms &amp; QR
          </span>
          <h1 className="section-heading mt-1">Room service</h1>
          <p className="text-masala-700 mt-1 text-sm">
            Add rooms and generate QR codes that guests scan to order from their room.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={refresh} className="btn-secondary">
            Refresh occupancy
          </button>
          <button
            onClick={() => setBulkSheet(true)}
            disabled={!rooms.length}
            className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300 text-saffron-700 px-4 py-2 text-sm font-semibold hover:bg-saffron-50 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Print QR sheet
          </button>
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add room
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-3 text-chilli-700 text-sm">
          <AlertTriangle className="inline mr-1.5 h-4 w-4" />
          {error}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="card p-10 text-center text-masala-700">
          No rooms yet. Add your first room to start room-service ordering.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((r) => (
            <RoomCard
              key={r.number}
              room={r}
              onDelete={() => remove(r)}
              onQr={() => setQrRoom(r)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {adding && (
          <Overlay onClose={() => setAdding(false)}>
            <h2 className="font-display text-2xl text-masala-900">New room</h2>
            <form onSubmit={create} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                  Room number
                </span>
                <input
                  autoFocus
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="mt-1.5 w-full bg-cream rounded-2xl border border-saffron-200 px-3 py-2.5 outline-none focus:border-saffron-400"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAdding(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </Overlay>
        )}
        {qrRoom && (
          <QRModal room={qrRoom} onClose={() => setQrRoom(null)} orgSlug={orgSlug} />
        )}
      </AnimatePresence>
      {bulkSheet && (
        <BulkQrSheet
          tables={rooms}
          serviceType="room"
          orgSlug={orgSlug}
          orgName={orgName}
          customerOrigin={customerOrigin}
          onClose={() => setBulkSheet(false)}
        />
      )}
    </div>
  )
}

function RoomCard({ room, onDelete, onQr }) {
  const occupied = room.status === 'occupied'
  return (
    <motion.div
      layout
      className={clsx(
        'card p-4 flex flex-col gap-3 relative overflow-hidden',
        occupied && 'ring-2 ring-chilli-300',
      )}
    >
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-saffron-200/40 blur-2xl pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-masala-600">Room</div>
          <div className="font-display text-4xl text-masala-900 leading-none">
            R{room.number}
          </div>
        </div>
        <span
          className={clsx(
            'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
            occupied ? 'bg-chilli-100 text-chilli-800' : 'bg-emerald-100 text-emerald-800',
          )}
        >
          {occupied ? '● Occupied' : '○ Available'}
        </span>
      </div>

      <div className="relative flex gap-2 mt-auto">
        <button onClick={onQr} className="btn-primary !py-2 !px-3 text-xs flex-1">
          <QrCode className="h-4 w-4" /> QR code
        </button>
        <button
          onClick={onDelete}
          disabled={occupied}
          className="inline-flex items-center justify-center rounded-full border border-chilli-200 text-chilli-700 hover:bg-chilli-50 disabled:opacity-40 disabled:hover:bg-transparent px-3 py-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

function QRModal({ room, onClose, orgSlug }) {
  const canvasRef = useRef(null)
  const url = orgSlug
    ? `${customerOrigin}/order/${orgSlug}/room/${room.number}`
    : `${customerOrigin}/?room=${room.number}`

  const download = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `masala-story-room-${room.number}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const print = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const canvas = canvasRef.current?.querySelector('canvas')
    const dataUrl = canvas?.toDataURL('image/png') || ''
    w.document.write(`
      <html><head><title>Room ${room.number} QR</title>
      <style>
        body{font-family:system-ui;margin:0;padding:32px;text-align:center;color:#1b1109}
        .card{display:inline-block;border:2px solid #fed7aa;border-radius:20px;padding:28px;background:#fff8ee;box-shadow:0 18px 40px -20px rgba(234,88,12,0.45)}
        h1{font-family:'Playfair Display',serif;font-size:44px;margin:0 0 8px;color:#9a3412}
        .sub{color:#7c2d12;letter-spacing:.3em;font-size:12px;text-transform:uppercase}
        .num{font-size:88px;font-family:'Playfair Display',serif;color:#ea580c;margin:8px 0}
        img{margin:8px 0;border:8px solid #fff;border-radius:16px}
        .scan{font-size:18px;margin-top:8px;color:#693b22}
      </style></head>
      <body>
        <div class="card">
          <div class="sub">Masala Story</div>
          <h1>Scan to order</h1>
          <div class="num">R${room.number}</div>
          <img src="${dataUrl}" width="260" height="260"/>
          <div class="scan">Open camera · Scan · Enjoy</div>
        </div>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <span className="eyebrow">Room {room.number}</span>
          <h2 className="font-display text-2xl text-masala-900 mt-1">Scan-to-order QR</h2>
          <p className="text-masala-700 text-sm mt-1">Print this and place it in the room.</p>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="mt-6 mx-auto p-6 rounded-3xl bg-cream border-2 border-dashed border-saffron-300 w-fit"
      >
        <QRCodeCanvas
          value={url}
          size={220}
          level="H"
          fgColor="#9a3412"
          bgColor="#fff8ee"
          includeMargin
          imageSettings={{
            src: 'data:image/svg+xml;utf8,' +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ea580c"/><text x="50%" y="55%" text-anchor="middle" font-size="34" font-family="serif" fill="white">🔥</text></svg>`,
              ),
            height: 40,
            width: 40,
            excavate: true,
          }}
        />
      </div>
      <div className="text-center mt-3 text-xs text-masala-600 break-all">{url}</div>

      <div className="mt-6 flex gap-2 justify-end">
        <button onClick={onClose} className="btn-ghost">
          Close
        </button>
        <button onClick={print} className="btn-secondary">
          <Printer className="h-4 w-4" /> Print
        </button>
        <button onClick={download} className="btn-primary">
          <Download className="h-4 w-4" /> Download PNG
        </button>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-md relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-saffron-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}
