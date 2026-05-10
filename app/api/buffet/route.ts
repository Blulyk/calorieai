import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth'
import { getSettings, createMeal, getDb } from '@/lib/db'

interface Breakdown {
  nigiri: number
  maki: number
  tempura: number
  gyoza: number
  postre: number
  otros: number
}

// ─── POST: finish a buffet session ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = getSettings(session.userId)
    const apiKey = settings?.gemini_api_key
    if (!apiKey) {
      return NextResponse.json({ error: 'Añade tu API key de Gemini en el perfil' }, { status: 400 })
    }

    const body = await req.json() as {
      total_pieces: number
      breakdown: Breakdown
      duration_minutes: number
    }

    const { total_pieces, breakdown, duration_minutes } = body
    if (!total_pieces || total_pieces < 1) {
      return NextResponse.json({ error: 'Debes registrar al menos una pieza' }, { status: 400 })
    }

    // ── Fetch previous record ─────────────────────────────────────────────────
    const db = getDb()
    const buffetMeals = db.prepare(
      `SELECT notes FROM meals WHERE user_id = ? AND notes LIKE '%"buffet":true%' ORDER BY created_at ASC`
    ).all(session.userId) as { notes: string }[]

    let previousRecord = 0
    for (const m of buffetMeals) {
      try {
        const n = JSON.parse(m.notes)
        if (n?.buffet && typeof n.total_pieces === 'number') {
          previousRecord = Math.max(previousRecord, n.total_pieces)
        }
      } catch { /* skip */ }
    }
    const isFirstSession = buffetMeals.length === 0
    const isRecord = total_pieces > previousRecord

    // ── Build Gemini prompt ───────────────────────────────────────────────────
    const hasBreakdown = Object.values(breakdown).some(v => v > 0)
    const breakdownText = hasBreakdown
      ? Object.entries(breakdown)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `- ${capitalize(k)}: ${v} pieza${v !== 1 ? 's' : ''}`)
          .join('\n')
      : `- Total: ${total_pieces} piezas variadas`

    const prompt = `Eres un nutricionista experto en cocina japonesa. Un usuario ha comido estas piezas en un buffet de sushi durante ${duration_minutes} minuto${duration_minutes !== 1 ? 's' : ''}:

${breakdownText}
Total: ${total_pieces} piezas

Estima el contenido nutricional total de esta sesión usando porciones típicas de buffet japonés:
- Nigiri: ~30-35g/pieza (arroz + proteína)
- Maki roll: ~20-25g/pieza
- Tempura (gamba/vegetal): ~30-40g/pieza, rebozado incluido
- Gyoza: ~25-30g/pieza
- Postres (mochi, dorayaki, etc.): ~35-45g/pieza
- Otros: media de ~25g/pieza

Considera que en un buffet la gente come raciones normales (no gigantes). Responde ÚNICAMENTE con JSON válido sin markdown, en este formato exacto:
{"calories": 950, "protein": 42, "carbs": 110, "fat": 28, "summary": "Sesión de buffet equilibrada con buen aporte proteico gracias al pescado."}`

    // ── Call Gemini ───────────────────────────────────────────────────────────
    let nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, summary: '' }
    const models = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ]

    for (const model of models) {
      try {
        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
            }),
          }
        )
        if (!gemRes.ok) continue
        const gemData = await gemRes.json()
        const raw = gemData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) continue
        const parsed = JSON.parse(match[0])
        if (parsed.calories && parsed.protein !== undefined) {
          nutrition = {
            calories: Math.round(parsed.calories),
            protein: Math.round(parsed.protein),
            carbs: Math.round(parsed.carbs ?? 0),
            fat: Math.round(parsed.fat ?? 0),
            summary: parsed.summary || '',
          }
          break
        }
      } catch { continue }
    }

    // Fallback estimate if Gemini failed: ~35 kcal/piece average
    if (!nutrition.calories) {
      nutrition.calories = Math.round(total_pieces * 35)
      nutrition.protein  = Math.round(total_pieces * 1.8)
      nutrition.carbs    = Math.round(total_pieces * 5)
      nutrition.fat      = Math.round(total_pieces * 0.8)
      nutrition.summary  = 'Estimación basada en promedio de buffet japonés.'
    }

    // ── Save meal ─────────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const id = randomUUID()
    const notes = JSON.stringify({
      buffet: true,
      total_pieces,
      breakdown,
      duration_minutes,
      is_record: isRecord,
      previous_record: previousRecord,
      first_session: isFirstSession,
      summary: nutrition.summary,
    })

    createMeal({
      id,
      user_id: session.userId,
      date: today,
      photo_path: '/buffet-banner.svg',
      name: `Buffet de sushi · ${total_pieces} piezas`,
      foods: JSON.stringify([{
        name: 'Buffet de sushi',
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        portion: `${total_pieces} piezas`,
      }]),
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: 0,
      meal_type: 'lunch',
      notes,
    })

    return NextResponse.json({
      id,
      total_pieces,
      is_record: isRecord,
      is_first_session: isFirstSession,
      previous_record: previousRecord,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      summary: nutrition.summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── GET: buffet stats for achievements ──────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const buffetMeals = db.prepare(
      `SELECT notes FROM meals WHERE user_id = ? AND notes LIKE '%"buffet":true%' ORDER BY created_at ASC`
    ).all(session.userId) as { notes: string }[]

    let maxPieces = 0
    const totalSessions = buffetMeals.length

    for (const m of buffetMeals) {
      try {
        const n = JSON.parse(m.notes)
        if (n?.buffet && typeof n.total_pieces === 'number') {
          maxPieces = Math.max(maxPieces, n.total_pieces)
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({ max_pieces: maxPieces, total_sessions: totalSessions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
