import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const optcgApiProxy = {
  '/opcg-api': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/opcg-api/, ''),
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
    // OPTCG API does not send CORS headers; proxy JSON in dev. Prod: vercel.json rewrites /opcg-api/* → optcgapi.com.
    proxy: { ...optcgApiProxy },
  },
  preview: {
    proxy: { ...optcgApiProxy },
  },
})
