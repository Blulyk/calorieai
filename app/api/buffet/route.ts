import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSession } from '@/lib/auth'
import { getSettings, createMeal, getDb } from '@/lib/db'

// ── Local fallback values — only used if Gemini is unavailable ──────────────
// Calibrated to match Gemini's typical output for Japanese buffet portions
const FALLBACK: Record<string, { kcal: number; protein: number; carbs: number; fat: number }> = {
  nigiri:  { kcal: 70,  protein: 5.5,  carbs: 8.5,  fat: 1.2 },
  maki:    { kcal: 45,  protein: 1.8,  carbs: 7.5,  fat: 1.2 },
  tempura: { kcal: 85,  protein: 3.8,  carbs: 8.5,  fat: 4.0 },
  gyoza:   { kcal: 55,  protein: 3.2,  carbs: 5.5,  fat: 2.2 },
  postre:  { kcal: 95,  protein: 1.2,  carbs: 21.0, fat: 1.0 },
  otros:   { kcal: 60,  protein: 2.8,  carbs: 7.0,  fat: 1.8 },
}
const FALLBACK_AVG = { kcal: 66, protein: 3.5, carbs: 8.0, fat: 2.0 }

interface Breakdown {
  nigiri: number; maki: number; tempura: number
  gyoza: number; postre: number; otros: number
}

// ── Build the rich contextual prompt for Gemini ───────────────────────────────
function buildGeminiPrompt(breakdown: Breakdown, total_pieces: number, duration_minutes: number): string {
  const categorisedTotal = Object.values(breakdown).reduce((s, v) => s + v, 0)
  const uncategorised = Math.max(0, total_pieces - categorisedTotal)

  const sections: string[] = []

  if (breakdown.nigiri > 0) {
    sections.push(
      `• NIGIRI SUSHI — ${breakdown.nigiri} piezas\n` +
      `  Cada pieza: bola de arroz prensada a mano (~25-30 g de arroz de sushi adobado con vinagre de arroz, azúcar y sal) ` +
      `coronada con una loncha de pescado o marisco crudo (~12-18 g). ` +
      `Toppings más habituales en buffets: salmón, atún, gamba cocida, pez limón, erizo, tortilla dulce (tamago). ` +
      `El arroz lleva el aliño incluido; el pescado crudo aporta proteína y algo de grasa omega-3.`
    )
  }

  if (breakdown.maki > 0) {
    sections.push(
      `• MAKI ROLLS — ${breakdown.maki} piezas\n` +
      `  Cada pieza: sección transversal (~25-40 g) de un rollo de sushi. ` +
      `En buffets predominan los California rolls (arroz, surimi o cangrejo real, pepino, aguacate, ` +
      `sésamo tostado y frecuentemente mayonesa japonesa en exterior o interior), ` +
      `rolls de salmón, rolls de atún y piccante rolls con sriracha. ` +
      `Los California rolls con aguacate y mayonesa son notablemente más calóricos que los hosomaki simples. ` +
      `Considera una mezcla realista de tipos.`
    )
  }

  if (breakdown.tempura > 0) {
    sections.push(
      `• TEMPURA — ${breakdown.tempura} piezas\n` +
      `  Cada pieza: alimento rebozado con masa de tempura y frito en aceite vegetal a 170-180 °C. ` +
      `En buffets: principalmente gambas (ebi tempura, ~35-50 g con rebozado) y verduras ` +
      `(boniato, judía verde, brócoli, pimiento). ` +
      `IMPORTANTE: la masa de tempura absorbe entre un 15-25 % de su peso en aceite durante la fritura, ` +
      `lo que eleva significativamente las calorías respecto al ingrediente crudo. ` +
      `Una gamba tempura de tamaño medio contiene ~75-110 kcal dependiendo del grosor del rebozado.`
    )
  }

  if (breakdown.gyoza > 0) {
    sections.push(
      `• GYOZA — ${breakdown.gyoza} piezas\n` +
      `  Cada pieza: empanadilla japonesa de ~20-30 g. ` +
      `Relleno típico: cerdo y col (nira en algunas variantes). ` +
      `Cocción a la plancha con aceite (potsticker/yaki-gyoza): la base queda crujiente por el aceite, ` +
      `el vapor cocina la parte superior. ` +
      `El método de cocción añade grasa; una gyoza de tamaño estándar ronda las 45-60 kcal.`
    )
  }

  if (breakdown.postre > 0) {
    sections.push(
      `• POSTRES JAPONESES — ${breakdown.postre} piezas\n` +
      `  Cada pieza: postre típico de buffet japonés. Variedades más comunes: ` +
      `mochi (pastel de arroz glutinoso relleno de pasta de judía roja anko, helado o sésamo, ~40-55 g), ` +
      `dorayaki (dos tortitas dulces con relleno de anko, ~50-60 g), ` +
      `pudding de huevo al estilo japonés, o pastel de queso japonés. ` +
      `Alto contenido en hidratos de carbono simples y azúcar; grasa moderada.`
    )
  }

  if (breakdown.otros > 0) {
    sections.push(
      `• OTRAS PIEZAS — ${breakdown.otros} piezas\n` +
      `  Piezas variadas no clasificadas en las categorías anteriores. ` +
      `Pueden incluir: sashimi (solo pescado sin arroz, ~25-30 g/pieza, bajo en carbos y calorías), ` +
      `rollitos de primavera fritos (~50 g, ricos en grasa), takoyaki (bolitas de pulpo fritas en molde, ~25-30 g), ` +
      `edamame (contadas como piezas de vaina), ensalada de algas con sésamo, ` +
      `croquetas de cangrejo, o cualquier otro plato del buffet. ` +
      `Usa una estimación media representativa de este tipo de variedad.`
    )
  }

  if (uncategorised > 0) {
    sections.push(
      `• SIN CATEGORIZAR — ${uncategorised} piezas\n` +
      `  Piezas contadas en el total pero no asignadas a ninguna categoría. ` +
      `Usa la media ponderada de los tipos de sushi más habituales en un buffet japonés estándar.`
    )
  }

  return `Eres un dietista-nutricionista con doctorado en bromatología y 15 años de experiencia en análisis nutricional de cocina japonesa. Tu tarea es estimar con la máxima precisión posible el contenido nutricional total de una sesión de buffet japonés.

El usuario ha comido lo siguiente durante ${duration_minutes} minuto${duration_minutes !== 1 ? 's' : ''}:

${sections.join('\n\n')}

TOTAL: ${total_pieces} pieza${total_pieces !== 1 ? 's' : ''}

CONSIDERACIONES ADICIONALES OBLIGATORIAS:
- Estás analizando un buffet de restaurante japonés de gama media (NO alta cocina): las porciones son generosas y estandarizadas industrialmente
- El arroz de sushi pesa más de lo que parece; un nigiri completo con su topping suele rondar los 40-50 g
- Es muy probable que el usuario haya consumido condimentos: salsa de soja (prácticamente sin calorías), wasabi (~5 kcal), jengibre encurtido (~10 kcal total) — estos son negligibles
- Si hay California rolls o maki con mayonesa, NO los subestimes: la mayo japonesa es densa en calorías
- Tempura: sé generoso con las calorías por el aceite absorbido, es el error más común al subestimarla
- Considera que un buffet japonés de ${total_pieces} piezas con esta composición es una comida principal completa

Responde ÚNICAMENTE con JSON válido sin markdown ni texto adicional:
{"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "summary": "frase breve en español describiendo el perfil nutricional"}`
}

// ── Per-attempt diagnostic record ────────────────────────────────────────────
interface GeminiAttempt {
  model: string
  ok: boolean
  status: number | 'network_error' | 'parse_error' | 'bad_json' | 'sanity_failed'
  detail: string  // human-readable Spanish explanation
}

// ── Gemini call with model cascade — returns result + full attempt log ────────
async function callGemini(apiKey: string, prompt: string): Promise<{
  result: { calories: number; protein: number; carbs: number; fat: number; summary: string } | null
  attempts: GeminiAttempt[]
}> {
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash']
  const attempts: GeminiAttempt[] = []

  for (const model of models) {
    // ── Network call ────────────────────────────────────────────────────────
    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
          }),
          signal: AbortSignal.timeout(18000), // 18 s per model
        }
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')
      attempts.push({
        model, ok: false, status: 'network_error',
        detail: isTimeout
          ? `Tiempo de espera agotado (>18 s) — sin respuesta de Google`
          : `Error de red: ${msg}`,
      })
      continue
    }

    // ── HTTP error ──────────────────────────────────────────────────────────
    if (!res.ok) {
      let googleMsg = ''
      try {
        const errBody = await res.json()
        googleMsg = errBody?.error?.message ?? ''
      } catch { /* ignore parse error on error body */ }

      const friendlyStatus: Record<number, string> = {
        400: 'Petición inválida (API key incorrecta o prompt malformado)',
        401: 'API key no autorizada',
        403: 'Acceso denegado (API key sin permisos o proyecto desactivado)',
        429: 'Cuota de peticiones agotada — espera unos minutos',
        500: 'Error interno del servidor de Google',
        503: 'Servicio de Google temporalmente no disponible',
      }
      const friendly = friendlyStatus[res.status] ?? `HTTP ${res.status}`
      attempts.push({
        model, ok: false, status: res.status,
        detail: googleMsg ? `${friendly}: "${googleMsg}"` : friendly,
      })
      // 401/403 = key-level auth errors — no point trying other models with the same key
      // 429 = per-model quota, so we DO continue to the next model
      if (res.status === 403 || res.status === 401) break
      continue
    }

    // ── Parse response ──────────────────────────────────────────────────────
    let data: Record<string, unknown>
    try { data = await res.json() } catch {
      attempts.push({ model, ok: false, status: 'parse_error', detail: 'La respuesta de Google no era JSON válido' })
      continue
    }

    const raw: string = (data?.candidates as Array<{content:{parts:Array<{text:string}>}}>)?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!raw) {
      // Could be a safety block or empty candidates
      const blockReason = (data?.promptFeedback as {blockReason?: string})?.blockReason
      attempts.push({
        model, ok: false, status: 'parse_error',
        detail: blockReason
          ? `El prompt fue bloqueado por Google: ${blockReason}`
          : 'Gemini devolvió una respuesta vacía (sin candidatos)',
      })
      continue
    }

    // ── Extract JSON from text ──────────────────────────────────────────────
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      attempts.push({
        model, ok: false, status: 'bad_json',
        detail: `Gemini respondió texto pero sin JSON extraíble: "${cleaned.slice(0, 80)}"`,
      })
      continue
    }

    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(match[0]) } catch {
      attempts.push({ model, ok: false, status: 'bad_json', detail: 'El JSON devuelto por Gemini no era parseable' })
      continue
    }

    const calories = Math.round(Number(parsed.calories))
    const protein  = Math.round(Number(parsed.protein))
    const carbs    = Math.round(Number(parsed.carbs))
    const fat      = Math.round(Number(parsed.fat))

    if (!calories || calories < 50 || calories > 15000 || protein < 0 || carbs < 0 || fat < 0) {
      attempts.push({
        model, ok: false, status: 'sanity_failed',
        detail: `Valores fuera de rango: ${calories} kcal / ${protein}g P / ${carbs}g C / ${fat}g F — descartado`,
      })
      continue
    }

    // ── Success ─────────────────────────────────────────────────────────────
    attempts.push({ model, ok: true, status: res.status, detail: 'Análisis completado correctamente' })
    return {
      result: { calories, protein, carbs, fat, summary: String(parsed.summary ?? '') },
      attempts,
    }
  }

  return { result: null, attempts }
}

// ── Local fallback calculation ────────────────────────────────────────────────
function calcLocal(breakdown: Breakdown, total_pieces: number) {
  const categorisedTotal = Object.values(breakdown).reduce((s, v) => s + v, 0)
  const uncategorised    = Math.max(0, total_pieces - categorisedTotal)

  let calories = 0, protein = 0, carbs = 0, fat = 0

  for (const [cat, count] of Object.entries(breakdown) as [keyof typeof FALLBACK, number][]) {
    if (count <= 0) continue
    const n = FALLBACK[cat] ?? FALLBACK_AVG
    calories += n.kcal    * count
    protein  += n.protein * count
    carbs    += n.carbs   * count
    fat      += n.fat     * count
  }

  calories += FALLBACK_AVG.kcal    * uncategorised
  protein  += FALLBACK_AVG.protein * uncategorised
  carbs    += FALLBACK_AVG.carbs   * uncategorised
  fat      += FALLBACK_AVG.fat     * uncategorised

  return {
    calories: Math.round(calories),
    protein:  Math.round(protein),
    carbs:    Math.round(carbs),
    fat:      Math.round(fat),
    summary:  'Estimación local (Gemini no disponible).',
  }
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
      force_local?: boolean
    }

    const { total_pieces, breakdown, duration_minutes } = body
    if (!total_pieces || total_pieces < 1) {
      return NextResponse.json({ error: 'Debes registrar al menos una pieza' }, { status: 400 })
    }

    // ── Build prompt and call Gemini ─────────────────────────────────────────
    const settings = getSettings(session.userId)
    const apiKey   = settings?.gemini_api_key

    // ── Try Gemini; if it fails, return a specific signal (don't save yet) ────
    const forceLocal = (body as { force_local?: boolean }).force_local === true

    let nutrition: { calories: number; protein: number; carbs: number; fat: number; summary: string }
    let geminiUsed = false

    if (apiKey && !forceLocal) {
      const prompt = buildGeminiPrompt(breakdown, total_pieces, duration_minutes)
      const { result: geminiResult, attempts } = await callGemini(apiKey, prompt)

      if (!geminiResult) {
        // Gemini failed — return diagnostic info + local estimate WITHOUT saving
        const local = calcLocal(breakdown, total_pieces)
        return NextResponse.json({
          gemini_failed: true,
          local_estimate: local,
          attempts,            // full attempt log sent to client
        }, { status: 503 })
      }

      nutrition = geminiResult
      geminiUsed = true
    } else {
      nutrition = calcLocal(breakdown, total_pieces)
    }

    void geminiUsed

    const { calories, protein, carbs, fat, summary } = nutrition

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
      is_record:      isRecord,
      previous_record: previousRecord,
      first_session:  isFirstSession,
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
      is_record:       isRecord,
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
