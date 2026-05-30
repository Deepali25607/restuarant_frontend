import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchPlatformBranding } from '../lib/api'

// Platform-level branding (the SaaS itself). Persisted to localStorage so
// the shell can paint the right brand on the very first render, before the
// network call resolves. Refreshed on every app boot via loadPlatform().

const DEFAULT = {
  name: 'Masala Story',
  tagline: 'A taste of India',
  logoUrl: '',
  themeColor: '#ea580c',
  contactEmail: '',
  supportUrl: '',
}

export const usePlatformStore = create(
  persist(
    (set) => ({
      platform: DEFAULT,
      loaded: false,
      setPlatform: (patch) => set((s) => ({ platform: { ...s.platform, ...patch }, loaded: true })),
    }),
    { name: 'masala-story-platform' },
  ),
)

export async function loadPlatformBranding() {
  try {
    const data = await fetchPlatformBranding()
    usePlatformStore.getState().setPlatform(data || {})
  } catch {
    // Soft-fail: the persisted defaults still render. Backend may be down.
  }
}
