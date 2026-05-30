import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  IndianRupee,
  // Wallet,
  // Banknote,
  Wrench,
  Home,
  Lightbulb,
  ShoppingBasket,
  Users as UsersIcon,
  Tag,
} from 'lucide-react'
import clsx from 'clsx'
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../lib/api'

const CATEGORY_META = {
  salary: { label: 'Salary', icon: UsersIcon, tone: 'bg-amber-100 text-amber-800' },
  grocery: { label: 'Grocery', icon: ShoppingBasket, tone: 'bg-emerald-100 text-emerald-800' },
  electricity: { label: 'Electricity', icon: Lightbulb, tone: 'bg-yellow-100 text-yellow-800' },
  rent: { label: 'Rent', icon: Home, tone: 'bg-saffron-100 text-saffron-800' },
  maintenance: { label: 'Maintenance', icon: Wrench, tone: 'bg-orange-100 text-orange-800' },
  other: { label: 'Other', icon: Tag, tone: 'bg-masala-100 text-masala-800' },
}

const blank = { category: 'grocery', amount: '', note: '', date: new Date().toISOString().slice(0, 10) }

export default function AdminExpenses() {
  const [data, setData] = useState({ categories: [], expenses: [] })
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchExpenses()
      .then(setData)
      .catch((e) => toast.error(e?.response?.data?.message || e.message))
  }, [])

  const totals = useMemo(() => {
    const byCat = {}
    let sum = 0
    data.expenses.forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount
      sum += e.amount
    })
    return { byCat, sum }
  }, [data])

  const visible = filter === 'all' ? data.expenses : data.expenses.filter((e) => e.category === filter)

  const save = async () => {
    try {
      if (editing.id) {
        const updated = await updateExpense(editing.id, editing)
        setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === updated.id ? updated : e)) }))
        toast.success('Expense updated')
      } else {
        const created = await createExpense(editing)
        setData((d) => ({ ...d, expenses: [created, ...d.expenses] }))
        toast.success('Expense logged')
      }
      setEditing(null)
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    }
  }

  const remove = async (exp) => {
    if (!confirm(`Delete this ${exp.category} expense?`)) return
    try {
      await deleteExpense(exp.id)
      setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== exp.id) }))
      toast.success('Expense removed')
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow"><Receipt className="h-3.5 w-3.5" /> Accounting</span>
          <h1 className="section-heading mt-1">Expense tracker</h1>
          <p className="text-masala-700 mt-1 text-sm">
            Log every rupee that leaves the till — feeds straight into P&amp;L.
          </p>
        </div>
        <button onClick={() => setEditing({ ...blank })} className="btn-primary">
          <Plus className="h-4 w-4" /> New expense
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-chilli-200/50 blur-2xl" />
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">
              Total spent
            </div>
            <div className="font-display text-3xl text-masala-900 mt-2">
              ₹{totals.sum.toLocaleString()}
            </div>
            <div className="text-xs text-masala-600 mt-1">{data.expenses.length} entries</div>
          </div>
        </div>
        {Object.entries(totals.byCat)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amt]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.other
            return (
              <div key={cat} className="card p-5">
                <div className="flex items-center gap-2">
                  <meta.icon className="h-4 w-4 text-saffron-700" />
                  <div className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                    {meta.label}
                  </div>
                </div>
                <div className="font-display text-2xl text-masala-900 mt-2">
                  ₹{amt.toLocaleString()}
                </div>
              </div>
            )
          })}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
        {data.categories.map((c) => (
          <FilterPill
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
            label={CATEGORY_META[c]?.label || c}
          />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-saffron-50/60">
              <tr className="text-left text-xs uppercase tracking-widest text-masala-700">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-saffron-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-masala-600">
                    No expenses logged yet.
                  </td>
                </tr>
              ) : (
                visible.map((e) => {
                  const meta = CATEGORY_META[e.category] || CATEGORY_META.other
                  return (
                    <tr key={e.id} className="hover:bg-saffron-50/40">
                      <td className="px-4 py-3 text-masala-700 text-xs">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-full', meta.tone)}>
                          <meta.icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-masala-800">{e.note || '—'}</td>
                      <td className="px-4 py-3 text-right font-display text-base text-masala-900">
                        ₹{e.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => setEditing({ ...e, date: e.date.slice(0, 10) })}
                            className="btn-ghost !py-1.5 !px-3"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(e)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border border-chilli-200 text-chilli-700 hover:bg-chilli-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
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
                <h2 className="font-display text-2xl text-masala-900">
                  {editing.id ? 'Edit expense' : 'Log expense'}
                </h2>
                <button onClick={() => setEditing(null)} className="p-2 rounded-full hover:bg-saffron-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">
                    Category
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {data.categories.map((c) => {
                      const meta = CATEGORY_META[c] || CATEGORY_META.other
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditing({ ...editing, category: c })}
                          className={clsx(
                            'flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs font-semibold transition',
                            editing.category === c
                              ? 'bg-curry-gradient text-white border-transparent shadow-warm'
                              : 'bg-white text-masala-700 border-saffron-200 hover:bg-saffron-50',
                          )}
                        >
                          <meta.icon className="h-4 w-4" />
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Field
                  label="Amount (₹)"
                  type="number"
                  value={editing.amount}
                  onChange={(v) => setEditing({ ...editing, amount: v })}
                  icon={<IndianRupee className="h-4 w-4" />}
                />
                <Field
                  label="Date"
                  type="date"
                  value={editing.date}
                  onChange={(v) => setEditing({ ...editing, date: v })}
                />
                <Field
                  label="Note"
                  value={editing.note || ''}
                  onChange={(v) => setEditing({ ...editing, note: v })}
                  placeholder="Optional details"
                />
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
                <button onClick={save} className="btn-primary">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterPill({ active, onClick, label }) {
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

function Field({ label, value, onChange, type = 'text', placeholder, icon }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-masala-700">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 bg-cream rounded-2xl border border-saffron-200 px-3 py-2.5 focus-within:border-saffron-400">
        {icon && <span className="text-masala-500">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
    </label>
  )
}
