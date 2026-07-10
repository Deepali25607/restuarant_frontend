import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSessionStore = create(
  persist(
    (set, get) => ({
      tableNo: null,
      serviceType: 'table', // 'table' | 'room' | 'takeaway' — channel this session is on
      sessionId: null,
      cart: [],
      // Generic location setter. `setTable` is kept for existing callers and
      // simply forwards with serviceType='table'. Takeaway carries no number.
      setLocation: (serviceType, tableNo) =>
        set({
          serviceType: ['room', 'takeaway'].includes(serviceType) ? serviceType : 'table',
          tableNo: serviceType === 'takeaway' ? null : tableNo,
          sessionId:
            get().sessionId || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        }),
      setTable: (tableNo) =>
        set({
          tableNo,
          serviceType: 'table',
          sessionId:
            get().sessionId || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        }),
      clearTable: () => set({ tableNo: null, serviceType: 'table', sessionId: null, cart: [] }),
      addItem: (item) =>
        set((s) => {
          const key = `${item.id}|${item.instructions || ''}`
          const existing = s.cart.find(
            (c) => `${c.id}|${c.instructions || ''}` === key,
          )
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c === existing ? { ...c, qty: c.qty + 1 } : c,
              ),
            }
          }
          return { cart: [...s.cart, { ...item, qty: 1 }] }
        }),
      incrementItem: (id, instructions = '') =>
        set((s) => ({
          cart: s.cart.map((c) =>
            c.id === id && (c.instructions || '') === instructions
              ? { ...c, qty: c.qty + 1 }
              : c,
          ),
        })),
      decrementItem: (id, instructions = '') =>
        set((s) => ({
          cart: s.cart
            .map((c) =>
              c.id === id && (c.instructions || '') === instructions
                ? { ...c, qty: c.qty - 1 }
                : c,
            )
            .filter((c) => c.qty > 0),
        })),
      removeItem: (id, instructions = '') =>
        set((s) => ({
          cart: s.cart.filter(
            (c) => !(c.id === id && (c.instructions || '') === instructions),
          ),
        })),
      setInstructions: (id, oldInstr, newInstr) =>
        set((s) => ({
          cart: s.cart.map((c) =>
            c.id === id && (c.instructions || '') === oldInstr
              ? { ...c, instructions: newInstr }
              : c,
          ),
        })),
      clearCart: () => set({ cart: [] }),
      // The cart persists dish snapshots in localStorage, so admin edits
      // (price, GST rate, availability) made after an item was added would
      // otherwise go stale. Called with the freshly fetched menu to bring
      // every cart line up to date.
      syncWithMenu: (menu) =>
        set((s) => {
          if (!Array.isArray(menu) || !menu.length || !s.cart.length) return {}
          const byId = new Map(menu.map((d) => [d.id, d]))
          return {
            cart: s.cart.map((c) => {
              const fresh = byId.get(c.id)
              if (!fresh) return c
              return {
                ...c,
                name: fresh.name,
                price: fresh.price,
                gstRate: fresh.gstRate,
                image: fresh.image,
                isVeg: fresh.isVeg,
              }
            }),
          }
        }),
    }),
    { name: 'masala-story-session' },
  ),
)

export const selectCartCount = (s) =>
  s.cart.reduce((sum, item) => sum + item.qty, 0)

export const selectCartSubtotal = (s) =>
  s.cart.reduce((sum, item) => sum + item.qty * item.price, 0)
