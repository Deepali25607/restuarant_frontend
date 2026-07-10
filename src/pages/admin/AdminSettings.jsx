import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Upload, Loader2, Save, Trash2, Image as ImageIcon, Wallet, Table2, BedDouble, ShoppingBag, BadgeIndianRupee, CreditCard, Clock, Percent } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { fetchOrgSettings, updateOrgSettings, uploadImage } from '../../lib/api'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState('')
  const [tableEnabled, setTableEnabled] = useState(true)
  const [roomEnabled, setRoomEnabled] = useState(false)
  const [takeawayEnabled, setTakeawayEnabled] = useState(false)
  // Payment-method toggles.
  const [payCash, setPayCash] = useState(true)
  const [payUpi, setPayUpi] = useState(true)
  const [payCard, setPayCard] = useState(true)
  const [payQr, setPayQr] = useState(true)
  const [payLater, setPayLater] = useState(false)
  // Taxes: the restaurant-wide GST. 0 = no GST anywhere. Dishes can override
  // this rate individually from the menu editor.
  const [gstRate, setGstRate] = useState('5')
  const [taxLabel, setTaxLabel] = useState('GST')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Which channels the plan/platform allows. Restricted channels are hidden
  // below (and the server refuses to enable them). Defaults cover older
  // settings payloads that predate the field.
  const allowed = settings?.allowedChannels || { table: true, room: false, takeaway: false }
  const allChannelsAllowed = allowed.table && allowed.room && allowed.takeaway

  useEffect(() => {
    fetchOrgSettings()
      .then((s) => {
        setSettings(s)
        setPaymentQrUrl(s.paymentQrUrl || '')
        setTableEnabled(s.tableOrderingEnabled !== false)
        setRoomEnabled(Boolean(s.roomOrderingEnabled))
        setTakeawayEnabled(Boolean(s.takeawayOrderingEnabled))
        setPayCash(s.payCashEnabled !== false)
        setPayUpi(s.payUpiEnabled !== false)
        setPayCard(s.payCardEnabled !== false)
        setPayQr(s.payQrEnabled !== false)
        setPayLater(Boolean(s.payLaterEnabled))
        setGstRate(String(Number.isFinite(s.gstRate) ? s.gstRate : 5))
        setTaxLabel(s.taxLabel || 'GST')
      })
      .catch((e) => setError(e?.response?.data?.message || e.message))
  }, [])

  const dirty =
    settings &&
    (paymentQrUrl !== (settings.paymentQrUrl || '') ||
      tableEnabled !== (settings.tableOrderingEnabled !== false) ||
      roomEnabled !== Boolean(settings.roomOrderingEnabled) ||
      takeawayEnabled !== Boolean(settings.takeawayOrderingEnabled) ||
      payCash !== (settings.payCashEnabled !== false) ||
      payUpi !== (settings.payUpiEnabled !== false) ||
      payCard !== (settings.payCardEnabled !== false) ||
      payQr !== (settings.payQrEnabled !== false) ||
      payLater !== Boolean(settings.payLaterEnabled) ||
      Number(gstRate) !== (Number.isFinite(settings.gstRate) ? settings.gstRate : 5) ||
      taxLabel !== (settings.taxLabel || 'GST'))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      // Only send toggles for allowed channels — never try to enable a
      // restricted one (the server would reject it).
      const payload = {
        paymentQrUrl,
        payCashEnabled: payCash,
        payUpiEnabled: payUpi,
        payCardEnabled: payCard,
        payQrEnabled: payQr,
        payLaterEnabled: payLater,
        gstRate: Math.max(0, Math.min(100, Number(gstRate) || 0)),
        taxLabel: taxLabel.trim() || 'GST',
      }
      if (allowed.table) payload.tableOrderingEnabled = tableEnabled
      if (allowed.room) payload.roomOrderingEnabled = roomEnabled
      if (allowed.takeaway) payload.takeawayOrderingEnabled = takeawayEnabled
      const updated = await updateOrgSettings(payload)
      setSettings(updated)
      setPaymentQrUrl(updated.paymentQrUrl || '')
      setTableEnabled(updated.tableOrderingEnabled !== false)
      setRoomEnabled(Boolean(updated.roomOrderingEnabled))
      setTakeawayEnabled(Boolean(updated.takeawayOrderingEnabled))
      setPayCash(updated.payCashEnabled !== false)
      setPayUpi(updated.payUpiEnabled !== false)
      setPayCard(updated.payCardEnabled !== false)
      setPayQr(updated.payQrEnabled !== false)
      setPayLater(Boolean(updated.payLaterEnabled))
      setGstRate(String(Number.isFinite(updated.gstRate) ? updated.gstRate : 5))
      setTaxLabel(updated.taxLabel || 'GST')
      toast.success('Settings saved')
    } catch (e) {
      const msg = e?.response?.data?.message || e.message
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <span className="eyebrow">
        <Wallet className="h-3.5 w-3.5" /> Settings
      </span>
      <h1 className="section-heading mt-1">Payment &amp; QR code</h1>
      <p className="mt-2 text-sm text-masala-600 dark:text-saffron-200/70">
        Upload the UPI / payment QR code customers will scan to pay after placing an
        order. Leave it empty to offer cash-at-counter only.
      </p>

      {error && (
        <div className="card p-3 text-chilli-700 mt-4">{error}</div>
      )}

      {!settings ? (
        <div className="card p-10 mt-6 flex items-center justify-center text-masala-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings…
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mt-6"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-masala-800 dark:text-saffron-100">
            <QrCode className="h-4 w-4 text-saffron-600" /> Payment QR code
          </div>

          <div className="mt-4 grid sm:grid-cols-[180px_1fr] gap-5">
            <div className="aspect-square rounded-2xl bg-cream dark:bg-masala-800 border border-saffron-200 dark:border-masala-700 overflow-hidden flex items-center justify-center">
              {paymentQrUrl ? (
                <img src={paymentQrUrl} alt="Payment QR" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-10 w-10 text-saffron-400" />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <QrUploadField value={paymentQrUrl} onChange={setPaymentQrUrl} />
              <input
                value={paymentQrUrl}
                onChange={(e) => setPaymentQrUrl(e.target.value)}
                placeholder="…or paste a QR image URL"
                className="bg-cream dark:bg-masala-800 rounded-2xl border border-saffron-200 dark:border-masala-700 px-3 py-2 text-xs outline-none focus:border-saffron-400"
              />
              {paymentQrUrl && (
                <button
                  onClick={() => setPaymentQrUrl('')}
                  className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-chilli-600 hover:text-chilli-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove QR code
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-saffron-200/70 dark:border-masala-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-masala-800 dark:text-saffron-100">
              <Wallet className="h-4 w-4 text-saffron-600" /> Payment methods
            </div>
            <p className="mt-1 text-xs text-masala-600 dark:text-saffron-200/70">
              Choose which payment options guests see at checkout. Turn one off to hide it.
            </p>
            <div className="mt-4 space-y-3">
              <ToggleRow
                icon={BadgeIndianRupee}
                label="UPI"
                desc="Pay by UPI (online via Razorpay when configured)."
                checked={payUpi}
                onChange={setPayUpi}
              />
              <ToggleRow
                icon={CreditCard}
                label="Card"
                desc="Pay by debit/credit card (online via Razorpay when configured)."
                checked={payCard}
                onChange={setPayCard}
              />
              <ToggleRow
                icon={Wallet}
                label="Cash at counter"
                desc="Guest pays cash; the cashier confirms it at the desk."
                checked={payCash}
                onChange={setPayCash}
              />
              <ToggleRow
                icon={QrCode}
                label="Scan QR to pay"
                desc={
                  paymentQrUrl
                    ? 'Show the uploaded QR in the post-order popup.'
                    : 'Upload a payment QR above to use this option.'
                }
                checked={payQr && Boolean(paymentQrUrl)}
                disabled={!paymentQrUrl}
                onChange={setPayQr}
              />
              <ToggleRow
                icon={Clock}
                label="Pay Later"
                desc="Send the order to the kitchen now; the guest settles the bill afterwards. Stays marked pending payment."
                checked={payLater}
                onChange={setPayLater}
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-saffron-200/70 dark:border-masala-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-masala-800 dark:text-saffron-100">
              <Percent className="h-4 w-4 text-saffron-600" /> Taxes
            </div>
            <p className="mt-1 text-xs text-masala-600 dark:text-saffron-200/70">
              This rate applies to every dish on the bill. Set it to 0 to charge no tax.
              Individual dishes can override it from the menu editor (Menu → edit dish → GST %).
            </p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-200">
                  Tax rate (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="mt-1.5 w-full bg-cream dark:bg-masala-800 rounded-2xl border border-saffron-200 dark:border-masala-700 px-3 py-2 text-sm outline-none focus:border-saffron-400"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-masala-700 dark:text-saffron-200">
                  Label on the bill
                </span>
                <input
                  value={taxLabel}
                  onChange={(e) => setTaxLabel(e.target.value)}
                  placeholder="GST"
                  maxLength={20}
                  className="mt-1.5 w-full bg-cream dark:bg-masala-800 rounded-2xl border border-saffron-200 dark:border-masala-700 px-3 py-2 text-sm outline-none focus:border-saffron-400"
                />
              </label>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-saffron-200/70 dark:border-masala-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-masala-800 dark:text-saffron-100">
              Ordering channels
            </div>
            <p className="mt-1 text-xs text-masala-600 dark:text-saffron-200/70">
              Choose how guests can order. Turn a channel off to hide it from customers.
            </p>
            <div className="mt-4 space-y-3">
              {allowed.table && (
                <ToggleRow
                  icon={Table2}
                  label="Dine-in (tables)"
                  desc="Guests scan a table QR to order at the table."
                  checked={tableEnabled}
                  onChange={setTableEnabled}
                />
              )}
              {allowed.room && (
                <ToggleRow
                  icon={BedDouble}
                  label="Room service (rooms)"
                  desc="Guests scan a room QR to order to their room."
                  checked={roomEnabled}
                  onChange={setRoomEnabled}
                />
              )}
              {allowed.takeaway && (
                <ToggleRow
                  icon={ShoppingBag}
                  label="Takeaway"
                  desc="Guests order for pickup — no table or room needed."
                  checked={takeawayEnabled}
                  onChange={setTakeawayEnabled}
                />
              )}
            </div>
            {!allChannelsAllowed && (
              <p className="mt-3 text-xs text-masala-500 dark:text-saffron-200/60">
                Some ordering channels aren't included in your current plan. Contact your
                provider to enable {[!allowed.room && 'Room service', !allowed.takeaway && 'Takeaway']
                  .filter(Boolean)
                  .join(' & ') || 'more channels'}.
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && !saving && (
              <span className="text-xs text-masala-500">Unsaved changes</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange, disabled = false }) {
  return (
    <label
      className={clsx(
        'flex items-center gap-3 rounded-2xl border border-saffron-200 dark:border-masala-700 bg-cream/60 dark:bg-masala-800/40 px-4 py-3',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <div className="h-9 w-9 rounded-full bg-curry-gradient flex items-center justify-center shadow-warm shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-masala-900 dark:text-saffron-100">{label}</div>
        <div className="text-xs text-masala-600 dark:text-saffron-200/70">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 rounded-full transition shrink-0',
          disabled && 'cursor-not-allowed',
          checked ? 'bg-emerald-500' : 'bg-masala-300 dark:bg-masala-600',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}

function QrUploadField({ onChange }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max image size is 5 MB')
      return
    }
    setUploading(true)
    try {
      const res = await uploadImage(file)
      onChange(res.url)
      toast.success('QR code uploaded')
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFile(e.dataTransfer.files?.[0])
      }}
      className={clsx(
        'rounded-2xl border-2 border-dashed px-3 py-4 text-sm flex items-center gap-2 cursor-pointer transition',
        dragOver
          ? 'bg-saffron-100 border-saffron-400'
          : 'bg-cream dark:bg-masala-800 border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700',
      )}
    >
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-saffron-700" />
      ) : (
        <Upload className="h-4 w-4 text-saffron-700" />
      )}
      <span className="font-semibold text-masala-800 dark:text-saffron-100">
        {uploading ? 'Uploading…' : 'Drag & drop or click to upload QR'}
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={uploading}
      />
    </label>
  )
}
