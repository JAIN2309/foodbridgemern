import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev CSP — script-src needs 'unsafe-inline' because Vite's React Fast Refresh
// injects an inline preamble script whose hash changes on every dev server restart.
// Production uses the stricter meta tag in index.html (no inline scripts in prod build).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",   // unsafe-inline required for Vite HMR preamble
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org",
  "connect-src 'self' http://localhost:5001 http://localhost:5000 ws://localhost:5173 ws://localhost:5001 wss: https://*.sentry.io",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      // Enforce CSP as HTTP header in dev (takes precedence over meta tag)
      'Content-Security-Policy': CSP,
      // Additional headers the Vite dev server doesn't add by default
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'no-referrer',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})