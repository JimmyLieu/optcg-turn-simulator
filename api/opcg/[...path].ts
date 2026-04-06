/**
 * Proxies GET requests to optcgapi.com. GET-only — https://optcgapi.com/documentation
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end('Method not allowed')
    return
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost'
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const u = new URL(req.url || '/', `${proto}://${host}`)
  const prefix = '/api/opcg'
  if (!u.pathname.startsWith(prefix)) {
    res.status(404).end('Not found')
    return
  }

  const rest = u.pathname.slice(prefix.length) || '/'
  const upstream = `https://optcgapi.com${rest}${u.search}`

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers: {
      Accept: (req.headers.accept as string) || 'application/json',
    },
  })

  const ct = upstreamRes.headers.get('content-type')
  if (ct) res.setHeader('Content-Type', ct)
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')

  const buf = Buffer.from(await upstreamRes.arrayBuffer())
  res.status(upstreamRes.status).send(buf)
}
