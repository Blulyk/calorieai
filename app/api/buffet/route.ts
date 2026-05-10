import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth'
import { getSettings, createMeal, getDb } from '@/lib/db'

// ── Evidence-based per-piece nutritional values for Japanese buffet ─────────
// Sources: USDA FoodData, Japanese Nutrition Database, restaurant lab analyses
// All values per one standard buffet piece (not restaurant omakase)
const PIECE_NUTRITION: Record<string, { kcal: number; protein: number; carbs: number; fat: number }> = {
  nigiri:  { kcal: 52,  protein: 4.5,  carbs: 6.5,  fat: 0.8 },  // ~32g: rice + fish slice
  maki:    { kcal: 30,  protein: 1.4,  carbs: 5.5,  fat: 0.5 },  // ~22g: hosomaki piece
  tempura: { kcal: 75,  protein: 3.5,  carbs: 7.5,  fat: 3.5 },  // ~35g: battered prawn/veg
  gyoza:   { kcal: 50,  protein: 2.8,  carbs: 5.0,  fat: 2.0 },  // ~25g: pan-fried dumpling
  postre:  { kcal: 90,  protein: 1.0,  carbs: 20.0, fat: 0.8 },  // ~40g: mochi / dorayaki
  otros:   { kcal: 42,  protein: 2.2,  carbs: 5.2,  fat: 1.2 },  // avg of various items
}
// Weighted average (used for uncategorised pieces)
const AVG_PIECE = { kcal: 52, protein: 3.0, carbs: 6.5, fat: 1.5 }

interface Breakdown {
  nigiri: number; maki: number; tempura: number
  gyoza: number; postre: number; otros: number
}

// ── POST: finish a buffet session ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      total_pieces: number
      breakdown: Breakdown
      duration_minutes: number
    }

    const { total_pieces, breakdown, duration_minutes } = body
    if (!total_pieces || total_pieces < 1) {
      return NextResponse.json({ error: 'Debes registrar al menos una pieza' }, { status: 400 })
    }

    // ── Calculate nutrition locally using research-backed values ─────────────
    const categorisedTotal = Object.values(breakdown).reduce((s, v) => s + v, 0)
    const uncategorised    = Math.max(0, total_pieces - categorisedTotal)

    let calories = 0, protein = 0, carbs = 0, fat = 0

    for (const [cat, count] of Object.entries(breakdown)) {
      if (count <= 0) continue
      const n = PIECE_NUTRITION[cat] ?? AVG_PIECE
      calories += n.kcal    * count
      protein  += n.protein * count
      carbs    += n.carbs   * count
      fat      += n.fat     * count
    }

    // Uncategorised pieces: use weighted average
    calories += AVG_PIECE.kcal    * uncategorised
    protein  += AVG_PIECE.protein * uncategorised
    carbs    += AVG_PIECE.carbs   * uncategorised
    fat      += AVG_PIECE.fat     * uncategorised

    calories = Math.round(calories)
    protein  = Math.round(protein)
    carbs    = Math.round(carbs)
    fat      = Math.round(fat)

    // ── Optional Gemini summary (just text, doesn't affect numbers) ──────────
    let summary = ''
    const settings = getSettings(session.userId)
    const apiKey   = settings?.gemini_api_key
    if (apiKey) {
      try {
        const hasBreakdown = categorisedTotal > 0
        const breakdownText = hasBreakdown
          ? Object.entries(breakdown)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${capitalize(k)}: ${v}`)
              .join(', ')
          : `${total_pieces} piezas variadas`

        const summaryPrompt = `Un usuario ha comido en un buffet de sushi (${duration_minutes} min): ${breakdownText}. Total: ${total_pieces} piezas, ${calories} kcal. En una sola frase breve (máx. 20 palabras) en español: ¿qué balance da este buffet? Sin repetir los números.`

        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: summaryPrompt }] }],
              generationConfig: { temperature: 0.6, maxOutputTokens: 80 },
            }),
          }
        )
        if (gemRes.ok) {
          const gemData = await gemRes.json()
          const text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
          if (text.length > 5 && text.length < 200) summary = text
        }
      } catch { /* summary is optional, ignore errors */ }
    }

    // ── Fetch previous record ────────────────────────────────────────────────
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
    const isRecord       = total_pieces > previousRecord

    // ── Save meal ────────────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const id    = randomUUID()
    const notes = JSON.stringify({
      buffet: true,
      total_pieces,
      breakdown,
      duration_minutes,
      is_record: isRecord,
      previous_record: previousRecord,
      first_session: isFirstSession,
      summary,
    })

    createMeal({
      id,
      user_id:    session.userId,
      date:       today,
      photo_path: '/buffet-banner.svg',
      name:       `Buffet de sushi · ${total_pieces} piezas`,
      foods: JSON.stringify([{
        name:     'Buffet de sushi',
        calories, protein, carbs, fat,
        portion:  `${total_pieces} piezas`,
      }]),
      calories, protein, carbs, fat,
      fiber:     0,
      meal_type: 'lunch',
      notes,
    })

    return NextResponse.json({
      id, total_pieces,
      is_record: isRecord,
      is_first_session: isFirstSession,
      previous_record: previousRecord,
      calories, protein, carbs, fat,
      summary,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── GET: buffet stats for achievements ───────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getDb()
    const buffetMeals = db.prepare(
      `SELECT notes FROM meals WHERE user_id = ? AND notes LIKE '%"buffet":true%' ORDER BY created_at ASC`
    ).all(session.userId) as { notes: string }[]

    let maxPieces = 0
    for (const m of buffetMeals) {
      try {
        const n = JSON.parse(m.notes)
        if (n?.buffet && typeof n.total_pieces === 'number') {
          maxPieces = Math.max(maxPieces, n.total_pieces)
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({ max_pieces: maxPieces, total_sessions: buffetMeals.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
