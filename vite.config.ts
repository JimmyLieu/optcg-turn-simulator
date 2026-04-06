import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const optcgApiProxy = {
  '/optcgapi': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/optcgapi/, ''),
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
    // OPTCG API does not send CORS headers; proxy JSON in dev/preview. Deploy with the same /optcgapi → optcgapi.com rewrite.
    proxy: { ...optcgApiProxy },
  },
  preview: {
    proxy: { ...optcgApiProxy },
  },
})
