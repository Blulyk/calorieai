import { NextResponse } from 'next/server'
import { readUpload } from '@/lib/uploads'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { filename: string } }) {
  const upload = await readUpload(params.filename)
  if (!upload) return new NextResponse('Not found', { status: 404 })
  const ext = path.extname(upload.path).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

  return new NextResponse(new Uint8Array(upload.buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
