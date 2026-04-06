// Lokasi: app/api/media/[...path]/route.ts
// Proxy route untuk serve file dari R2 bucket tanpa bergantung pada R2 public domain
// Ini mengatasi masalah SSL certificate error pada domain r2.dev

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const key = path.join('/')

    if (!key) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    const { env } = await getCloudflareContext({ async: true })
    const object = await env.R2.get(key)

    if (!object) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('ETag', object.etag)

    // Check if-none-match for 304 responses
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch === object.etag) {
      return new NextResponse(null, { status: 304, headers })
    }

    return new NextResponse(object.body as ReadableStream, {
      status: 200,
      headers,
    })
  } catch (e: any) {
    console.error('R2 media proxy error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
