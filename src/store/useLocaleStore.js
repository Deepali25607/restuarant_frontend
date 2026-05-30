import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
]

function applyLang(code) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('lang', code)
}

export const useLocaleStore = create(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => {
        applyLang(locale)
        set({ locale })
      },
      hydrate: () => applyLang(get().locale),
    }),
    {
      name: 'masala-story-locale',
      onRehydrateStorage: () => (state) => {
        if (state) applyLang(state.locale)
      },
    },
  ),
)
