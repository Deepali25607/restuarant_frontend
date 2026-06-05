import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Upload, Loader2, Save, Trash2, Image as ImageIcon, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { fetchOrgSettings, updateOrgSettings, uploadImage } from '../../lib/api'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchOrgSettings()
      .then((s) => {
        setSettings(s)
        setPaymentQrUrl(s.paymentQrUrl || '')
      })
      .catch((e) => setError(e?.response?.data?.message || e.message))
  }, [])

  const dirty = settings && paymentQrUrl !== (settings.paymentQrUrl || '')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateOrgSettings({ paymentQrUrl })
      setSettings(updated)
      setPaymentQrUrl(updated.paymentQrUrl || '')
      toast.success('Payment settings saved')
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
