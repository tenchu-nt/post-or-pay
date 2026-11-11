import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // dev: proxy /api to `vercel dev` on 3030 when running both
  server: { proxy: { '/api': 'http://localhost:3030' } },
})
