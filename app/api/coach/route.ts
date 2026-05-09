import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, getDailyStats } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

function todayStr() { return new Date().toISOString().split('T')[0] }

// Try cheapest model first, escalate on quota errors
const COACH_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

function extractCode(msg: string): number {
  const m = msg.match(/\[(\d{3})\s/) || msg.match(/\b(429|503|500|502|400|401|403)\b/)
  return m ? Number(m[1]) : 500
}

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = getSettings(session.userId)
    if (!settings?.gemini_api_key)
      return NextResponse.json({ error: 'No tienes API key de Gemini configurada.' }, { status: 400 })

    const stats = getDailyStats(session.userId, todayStr())
    const goal  = settings.calorie_goal || 2000

    const prompt = `Eres un coach nutricional conciso. El usuario lleva hoy:
- Calorías: ${Math.round(stats.calories)} de ${goal} kcal
- Proteína: ${Math.round(stats.protein)}g
- Carbohidratos: ${Math.round(stats.carbs)}g
- Grasas: ${Math.round(stats.fat)}g

Da UN consejo breve y accionable (máximo 2 frases). Sé específico: menciona un alimento concreto o una acción concreta. Responde SOLO con el consejo, sin saludos ni introducciones.`

    const genAI = new GoogleGenerativeAI(settings.gemini_api_key)
    const errors: string[] = []

    for (const modelName of COACH_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const tip = result.response.text().trim()
        return NextResponse.json({ tip, model_used: modelName })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        const code = extractCode(msg)
        errors.push(`${modelName}: ${code}`)

        // Only continue to next model on quota/overload
        if (code === 429 || code === 503) continue

        // Any other error — stop immediately with clean message
        return NextResponse.json(
          { error: `Error al contactar Gemini (${code}). Inténtalo de nuevo.` },
          { status: code }
        )
      }
    }

    // All models exhausted — quota hit
    return NextResponse.json(
      {
        error: 'Has alcanzado el límite de uso de Gemini (429). Espera unos minutos y vuelve a intentarlo, o comprueba tu plan en ai.google.dev.',
        models_tried: errors,
      },
      { status: 429 }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
