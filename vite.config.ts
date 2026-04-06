import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const optcgApiProxy = {
  '/api/opcg': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/opcg/, ''),
  },
  '/optcg-media': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/optcg-media/, '/media'),
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // OPTCG API does not send CORS headers; proxy JSON in dev. Prod: api/opcg/[...path].ts Edge function.
    proxy: { ...optcgApiProxy },
  },
  preview: {
    proxy: { ...optcgApiProxy },
  },
})
