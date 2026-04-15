import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// optcgapi.com does not send CORS headers; proxy images in dev.
// Prod: vercel.json rewrites /optcg-media/* → optcgapi.com/media/*.
const mediaProxy = {
  '/optcg-media': {
    target: 'https://optcgapi.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/optcg-media/, '/media'),
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { ...mediaProxy } },
  preview: { proxy: { ...mediaProxy } },
})
