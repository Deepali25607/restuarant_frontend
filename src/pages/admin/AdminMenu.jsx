import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Save, Image as ImageIcon, AlertTriangle, UtensilsCrossed, Upload, Loader2, Package, PackagePlus, Timer } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { fetchMenu, fetchCategories, createDish, updateDish, deleteDish, uploadImage, restockDish } from '../../lib/api'
import SpiceMeter from '../../components/SpiceMeter'
import DishImage from '../../components/DishImage'
import UsageGauge, { refreshUsage } from '../../components/admin/UsageGauge'

const blank = {
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  image: '',
  isVeg: true,
  spice: 1,
  available: true,
  tag: '',
  trackStock: false,
  stock: 0,
  lowStockAt: 5,
  prepMinutes: 0,
}

export default function AdminMenu() {
  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [restocking, setRestocking] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchMenu(), fetchCategories()])
      .then(([m, c]) => {
        setMenu(m)
        setCategories(c)
      })
      .catch((e) => setError(e?.response?.data?.message || e.message))
  }, [])

  const visible = useMemo(
    () => (filter === 'all' ? menu : menu.filter((d) => d.categoryId === filter)),
    [menu, filter],
  )

  const startNew = () =>
    setEditing({ ...blank, categoryId: categories[0]?.id || '' })
  const startEdit = (d) => setEditing({ ...d })
  const cancel = () => setEditing(null)

  const save = async () => {
    if (!editing.name || !editing.categoryId || !editing.price) {
      setError('Name, category, and price are required.')
      return
    }
    try {
      if (editing.id) {
        const updated = await updateDish(editing.id, editing)
        setMenu((m) => m.map((d) => (d.id === updated.id ? updated : d)))
      } else {
        const created = await createDish(editing)
        setMenu((m) => [...m, created])
        refreshUsage()
      }
      setEditing(null)
      setError('')
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const toggleAvailable = async (d) => {
    try {
      const updated = await updateDish(d.id, { available: !d.available })
      setMenu((m) => m.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  const removeDish = async (d) => {
    if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return
    try {
      await deleteDish(d.id)
      setMenu((m) => m.filter((x) => x.id !== d.id))
      refreshUsage()
    } catch (e) {
      setError(e?.response?.data?.message || e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><UtensilsCrossed className="h-3.5 w-3.5" /> Menu</span>
          <h1 className="section-heading mt-1">Manage dishes</h1>
          <div className="mt-2"><UsageGauge resource="dishes" /></div>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus className="h-4 w-4" /> New dish
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <FilterPill active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
        {categories.map((c) => (
          <FilterPill
            key={c.id}
            active={filter === c.id}
            label={`${c.emoji} ${c.name}`}
            onClick={() => setFilter(c.id)}
          />
        ))}
      </div>

      {error && (
        <div className="card p-3 text-chilli-700 text-sm">
          <AlertTriangle className="inline mr-1.5 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((d) => (
          <motion.div
            key={d.id}
            layout
            className={clsx(
              'card overflow-hidden flex flex-col',
              !d.available && 'opacity-70',
            )}
          >
            <div className="aspect-[4/3] bg-saffron-100 relative">
              <DishImage
                src={d.image}
                alt={d.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className={d.isVeg ? 'veg-dot' : 'nonveg-dot'} />
              </div>
              {d.tag && (
                <span className="absolute top-3 right-3 chip">{d.tag}</span>
              )}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight">
                  {d.name}
                </h3>
                <SpiceMeter level={d.spice} />
              </div>
              <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                {d.description}
              </p>

              {d.trackStock && <StockBadge dish={d} />}
              {d.prepMinutes > 0 && (
                <span className="mt-2 inline-flex self-start items-center gap-1 text-[11px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full bg-saffron-50 dark:bg-masala-700/40 text-saffron-700 dark:text-saffron-300">
                  <Timer className="h-3 w-3" /> {d.prepMinutes} min prep
                </span>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="font-display text-xl">₹{d.price}</div>
                <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={d.available}
                    onChange={() => toggleAvailable(d)}
                    className="accent-saffron-600"
                  />
                  Available
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(d)} className="btn-secondary !py-1.5 !px-3 text-xs flex-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => setRestocking({ id: d.id, name: d.name, stock: d.stock, lowStockAt: d.lowStockAt, add: 10 })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-saffron-200 dark:border-masala-700 hover:bg-saffron-50 dark:hover:bg-masala-700"
                  title="Restock"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeDish(d)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-chilli-200 text-chilli-700 hover:bg-chilli-50 dark:hover:bg-chilli-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-masala-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={cancel}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl text-masala-900">
                  {editing.id ? 'Edit dish' : 'New dish'}
                </h2>
                <button onClick={cancel} className="p-2 rounded-full hover:bg-saffron-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <Field
                  label="Name"
                  value={editing.name}
                  onChange={(v) => setEditing({ ...editing, name: v })}
                />
                <Field
                  label="Category"
                  type="select"
                  value={editing.categoryId}
                  onChange={(v) => setEditing({ ...editing, categoryId: v })}
                  options={categories.map((c) => ({ value: c.id, label: `${c.emoji} ${c.name}` }))}
                />
                <Field
                  label="Price (₹)"
                  type="number"
                  value={editing.price}
                  onChange={(v) => setEditing({ ...editing, price: Number(v) })}
                />
                <Field
                  label="Spice level (0–3)"
                  type="number"
                  value={editing.spice}
                  onChange={(v) => setEditing({ ...editing, spice: Number(v) })}
                />
                <Field
                  label="Prep minutes (0 = use default)"
                  type="number"
                  value={editing.prepMinutes ?? 0}
                  onChange={(v) => setEditing({ ...editing, prepMinutes: Math.max(0, Number(v) || 0) })}
                />
                <div className="sm:col-span-2">
                  <ImageField
                    value={editing.image}
                    onChange={(v) => setEditing({ ...editing, image: v })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Description"
                    type="textarea"
                    value={editing.description}
                    onChange={(v) => setEditing({ ...editing, description: v })}
                  />
                </div>
                <Field
                  label="Tag"
                  value={editing.tag || ''}
                  onChange={(v) => setEditing({ ...editing, tag: v })}
                  placeholder="Chef’s pick, Bestseller…"
                />
                <div className="flex items-end gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.isVeg}
                      onChange={(e) => setEditing({ ...editing, isVeg: e.target.checked })}
                      className="accent-emerald-600"
                    />
                    <span className={editing.isVeg ? 'veg-dot' : 'nonveg-dot'} /> Veg
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.available}
                      onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                      className="accent-saffron-600"
                    />
                    Available
                  </label>
                </div>

                <div
                  className="sm:col-span-2 rounded-2xl p-4 border"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                >
                  <label className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Package className="h-4 w-4 text-saffron-600" />
                      Track today&apos;s stock
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(editing.trackStock)}
                      onChange={(e) => setEditing({ ...editing, trackStock: e.target.checked })}
                      className="accent-saffron-600 h-4 w-4"
                    />
                  </label>
                  {editing.trackStock && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <Field
                        label="Portions ready"
                        type="number"
                        value={editing.stock || 0}
                        onChange={(v) => setEditing({ ...editing, stock: Math.max(0, Number(v) || 0) })}
                      />
                      <Field
                        label="Alert when below"
                        type="number"
                        value={editing.lowStockAt ?? 5}
                        onChange={(v) => setEditing({ ...editing, lowStockAt: Math.max(0, Number(v) || 0) })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={cancel} className="btn-ghost">Cancel</button>
                <button onClick={save} className="btn-primary">
                  <Save className="h-4 w-4" /> {editing.id ? 'Save changes' : 'Create dish'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {restocking && (
          <RestockDialog
            initial={restocking}
            onClose={() => setRestocking(null)}
            onSaved={(updated) => {
              setMenu((m) => m.map((d) => (d.id === updated.id ? updated : d)))
              setRestocking(null)
              toast.success(`"${updated.name}" restocked — ${updated.stock} ready`)
            }}
            onError={(msg) => toast.error(msg)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StockBadge({ dish }) {
  const out = dish.stock === 0
  const low = !out && dish.stock <= dish.lowStockAt
  const tone = out
    ? 'bg-chilli-100 text-chilli-800 dark:bg-chilli-900/40 dark:text-chilli-200'
    : low
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
  const label = out
    ? `Out of stock`
    : low
      ? `Low: ${dish.stock} left`
      : `${dish.stock} portions`
  return (
    <span
      className={clsx(
        'mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full self-start',
        tone,
      )}
    >
      <Package className="h-3 w-3" /> {label}
    </span>
  )
}

function RestockDialog({ initial, onClose, onSaved, onError }) {
  const [mode, setMode] = useState('add')
  const [add, setAdd] = useState(initial.add ?? 10)
  const [set, setSet] = useState(initial.stock ?? 0)
  const [lowStockAt, setLowStockAt] = useState(initial.lowStockAt ?? 5)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const payload = mode === 'add' ? { add: Number(add) } : { set: Number(set) }
      payload.lowStockAt = Number(lowStockAt)
      const updated = await restockDish(initial.id, payload)
      onSaved(updated)
    } catch (e) {
      onError(e?.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

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
        className="card p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-saffron-600" /> Restock
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-saffron-100 dark:hover:bg-masala-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {initial.name} · currently <span className="font-semibold">{initial.stock}</span> portions
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setMode('add')}
            className={clsx(
              'flex-1 rounded-2xl px-3 py-2 text-sm font-semibold border transition',
              mode === 'add'
                ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-200 border-saffron-200 dark:border-masala-700',
            )}
          >
            Add portions
          </button>
          <button
            onClick={() => setMode('set')}
            className={clsx(
              'flex-1 rounded-2xl px-3 py-2 text-sm font-semibold border transition',
              mode === 'set'
                ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                : 'bg-white dark:bg-masala-800 text-masala-700 dark:text-saffron-200 border-saffron-200 dark:border-masala-700',
            )}
          >
            Set exact
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {mode === 'add' ? (
            <Field
              label="Portions to add"
              type="number"
              value={add}
              onChange={(v) => setAdd(v)}
            />
          ) : (
            <Field
              label="Portions ready now"
              type="number"
              value={set}
              onChange={(v) => setSet(v)}
            />
          )}
          <Field
            label="Alert when below"
            type="number"
            value={lowStockAt}
            onChange={(v) => setLowStockAt(v)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Restock'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FilterPill({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition border',
        active
          ? 'bg-curry-gradient text-white border-transparent shadow-warm'
          : 'bg-white text-masala-800 border-saffron-200 hover:bg-saffron-50',
      )}
    >
      {label}
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', options, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">
        {label}
      </span>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="mt-1.5 w-full bg-cream rounded-2xl border border-saffron-200 px-3 py-2 text-sm outline-none focus:border-saffron-400 resize-none"
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full bg-cream rounded-2xl border border-saffron-200 px-3 py-2 text-sm outline-none focus:border-saffron-400"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5 w-full bg-cream rounded-2xl border border-saffron-200 px-3 py-2 text-sm outline-none focus:border-saffron-400"
        />
      )}
    </label>
  )
}

function ImageField({ value, onChange }) {
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
      toast.success('Image uploaded')
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">
        Dish photo
      </span>
      <div className="mt-1.5 grid sm:grid-cols-[140px_1fr] gap-3">
        <div className="aspect-square rounded-2xl bg-cream border border-saffron-200 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="dish" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-saffron-400" />
          )}
        </div>
        <div className="flex flex-col gap-2">
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
              'rounded-2xl border-2 border-dashed px-3 py-3 text-sm flex items-center gap-2 cursor-pointer transition',
              dragOver
                ? 'bg-saffron-100 border-saffron-400'
                : 'bg-cream border-saffron-200 hover:bg-saffron-50',
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-saffron-700" />
            ) : (
              <Upload className="h-4 w-4 text-saffron-700" />
            )}
            <span className="font-semibold text-masala-800">
              {uploading ? 'Uploading…' : 'Drag &amp; drop or click to upload'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
              disabled={uploading}
            />
          </label>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="bg-cream rounded-2xl border border-saffron-200 px-3 py-2 text-xs outline-none focus:border-saffron-400"
          />
        </div>
      </div>
    </div>
  )
}
