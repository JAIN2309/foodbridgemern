import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org",
  "connect-src 'self' http://localhost:5001 http://localhost:5000 ws://localhost:5173 ws://localhost:5001 wss:",
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