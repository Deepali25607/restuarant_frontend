import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => set({ token, user }),
      updateUser: (patch) => {
        const u = get().user
        if (!u) return
        set({ user: { ...u, ...patch } })
      },
      logout: () => set({ token: null, user: null }),
      hasPerm: (perm) => {
        const u = get().user
        if (!u) return false
        const list = u.permissions || []
        return Array.isArray(perm) ? perm.every((p) => list.includes(p)) : list.includes(perm)
      },
    }),
    { name: 'masala-story-auth' },
  ),
)
