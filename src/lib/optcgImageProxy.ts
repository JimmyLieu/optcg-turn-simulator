/**
 * Rewrites OPTCG CDN image URLs to same-origin paths so images are not
 * cross-origin (needed for canvas / html-to-image without tainting).
 *
 * Dev: Vite proxies `/optcg-media/*` → `optcgapi.com/media/*`
 * Prod: Vercel rewrite (same path).
 */
const OPTCG_MEDIA = /^https?:\/\/optcgapi\.com\/media\/(.+)$/i

export function proxiedOptcgImageUrl(url: string | undefined): string | undefined {
  if (!url) return url
  const m = url.match(OPTCG_MEDIA)
  if (m) return `/optcg-media/${m[1]}`
  return url
}
