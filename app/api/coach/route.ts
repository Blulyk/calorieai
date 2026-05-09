import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, getDailyStats } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

function todayStr() { return new Date().toISOString().split('T')[0] }

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const settings = getSettings(session.userId)
    if (!settings?.gemini_api_key) return NextResponse.json({ error: 'No API key configured' }, { status: 400 })
    const stats = getDailyStats(session.userId, todayStr())
    const goal = settings.calorie_goal || 2000
    const genAI = new GoogleGenerativeAI(settings.gemini_api_key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `Eres un coach nutricional conciso. El usuario lleva hoy:
- Calorías: ${Math.round(stats.calories)} de ${goal} kcal
- Proteína: ${Math.round(stats.protein)}g
- Carbohidratos: ${Math.round(stats.carbs)}g
- Grasas: ${Math.round(stats.fat)}g

Da UN consejo breve y accionable (máximo 2 frases). Sé específico: menciona un alimento concreto o una acción concreta. Responde SOLO con el consejo, sin saludos ni introducciones.`
    const result = await model.generateContent(prompt)
    const tip = result.response.text().trim()
    return NextResponse.json({ tip })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
