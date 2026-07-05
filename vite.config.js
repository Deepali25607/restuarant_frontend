import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is deployed under the "/OrderNow" sub-path of nexussoftlab.com
// (https://nexussoftlab.com/OrderNow), so every built asset URL must be
// prefixed with it. `base` drives that, and it also feeds
// `import.meta.env.BASE_URL`, which the router basename + QR links read.
// Override at build time with `VITE_BASE_PATH=/ npm run build` for a root deploy.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/OrderNow/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
  },
})
