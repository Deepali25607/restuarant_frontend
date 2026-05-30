import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSessionStore = create(
  persist(
    (set, get) => ({
      tableNo: null,
      sessionId: null,
      cart: [],
      setTable: (tableNo) =>
        set({
          tableNo,
          sessionId:
            get().sessionId || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        }),
      clearTable: () => set({ tableNo: null, sessionId: null, cart: [] }),
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
    }),
    { name: 'masala-story-session' },
  ),
)

export const selectCartCount = (s) =>
  s.cart.reduce((sum, item) => sum + item.qty, 0)

export const selectCartSubtotal = (s) =>
  s.cart.reduce((sum, item) => sum + item.qty * item.price, 0)
