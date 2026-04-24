import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings } from '@/lib/db'
import { analyzeFood } from '@/lib/gemini'

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
    const message = err instanceof Error ? err.message : 'Analysis failed'
    const status  = message.includes('429') ? 429 : 422
    return NextResponse.json({ error: message }, { status })
  }
}
