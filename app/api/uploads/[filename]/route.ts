import { NextResponse } from 'next/server'
import { readUpload } from '@/lib/uploads'
import path from 'path'

export async function GET(
  _req: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const upload = await readUpload(filename)
  if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ext = path.extname(filename).toLowerCase()
  const contentType =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    'application/octet-stream'

  return new NextResponse(upload.buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
