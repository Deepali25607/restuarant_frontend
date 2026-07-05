import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import I18nProvider from './i18n/I18nProvider.jsx'
import { useThemeStore } from './store/useThemeStore'
import { useLocaleStore } from './store/useLocaleStore'
import { loadPlatformBranding } from './store/usePlatformStore'

// Apply persisted theme + locale before first paint.
useThemeStore.getState().hydrate()
useLocaleStore.getState().hydrate()

// Refresh platform branding in the background. The persisted store renders
// the previous value immediately; this just makes sure we pick up changes
// from the super-admin without a hard reload.
loadPlatformBranding()

// The app is served from a sub-path (e.g. "/OrderNow") in production. Vite's
// BASE_URL carries that value ("/OrderNow/" or "/" in dev); strip the trailing
// slash so React Router treats every in-app route as relative to it.
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <I18nProvider>
        <App />
        <Toaster
          position="top-right"
          className="masala-toaster"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily:
                '"Plus Jakarta Sans", system-ui, sans-serif',
              borderRadius: '18px',
              border: '1px solid rgba(254,215,170,0.6)',
            },
          }}
        />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
