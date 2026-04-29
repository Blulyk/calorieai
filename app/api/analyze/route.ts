import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings } from '@/lib/db'
import { GeminiApiError, analyzeFood } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = getSettings(session.userId)
    if (!settings?.gemini_api_key) {
      return NextResponse.json({ error: 'Add your Gemini API key in Profile settings first' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const analysis = await analyzeFood(settings.gemini_api_key, base64, file.type)
    return NextResponse.json({ analysis })
  } catch (err: unknown) {
    if (err instanceof GeminiApiError) {
      return NextResponse.json({
        error: err.message,
        code: err.code,
        retryable: err.retryable,
        retry_after_seconds: err.retryAfterSeconds,
      }, { status: err.code })
    }

    const message = err instanceof Error ? err.message : 'No se pudo completar el analisis.'
    return NextResponse.json({
      error: message,
      code: 422,
      retryable: false,
      retry_after_seconds: null,
    }, { status: 422 })
  }
}
