/**
 * Proxies GET requests to optcgapi.com (CORS-safe for the browser).
 * API is GET-only — see https://optcgapi.com/documentation
 *
 * Must stay under `/api/*` so Vercel runs this Function; do not use `routes` in
 * vercel.json with `/(.*) -> index.html` or `/api` requests will get SPA HTML.
 */
export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const prefix = '/api/opcg'
  if (!url.pathname.startsWith(prefix)) {
    return new Response('Not found', { status: 404 })
  }

  const rest = url.pathname.slice(prefix.length) || '/'
  const upstream = new URL(`https://optcgapi.com${rest}`)
  upstream.search = url.search

  const upstreamRes = await fetch(upstream.toString(), {
    method: request.method,
    headers: {
      Accept: request.headers.get('accept') || 'application/json',
    },
  })

  const headers = new Headers()
  const ct = upstreamRes.headers.get('content-type')
  if (ct) headers.set('Content-Type', ct)
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate')

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  })
}
