/**
 * Proxies JSON card API to optcgapi.com (CORS-safe for the browser).
 * Vercel external rewrites to /optcgapi were returning index.html in production;
 * /api/* is routed to Functions reliably.
 */
export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const prefix = '/api/opcg'
  if (!url.pathname.startsWith(prefix)) {
    return new Response('Not found', { status: 404 })
  }

  const rest = url.pathname.slice(prefix.length) || '/'
  const upstream = new URL(`https://optcgapi.com${rest}`)
  upstream.search = url.search

  const upstreamRes = await fetch(upstream.toString(), {
    headers: {
      Accept: request.headers.get('accept') || 'application/json',
    },
  })

  const headers = new Headers()
  const ct = upstreamRes.headers.get('content-type')
  if (ct) headers.set('Content-Type', ct)

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  })
}
