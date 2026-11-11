import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // dev: proxy /api to scripts/dev-api.mjs (same API_PORT, default 3030)
  server: { proxy: { '/api': `http://localhost:${process.env.API_PORT || 3030}` } },
})
