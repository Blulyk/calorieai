import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings } from '@/lib/db'
import { analyzeRecipe } from '@/lib/gemini'

interface SchemaRecipe {
  name?: string
  recipeIngredient?: string[]
  recipeYield?: string | number
  description?: string
}

function extractSchema(html: string): SchemaRecipe | null {
  const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const s of scripts) {
    try {
      const json = JSON.parse(s[1])
      const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      const recipe = items.find((i: { '@type'?: string }) => i['@type'] === 'Recipe' || i['@type']?.includes?.('Recipe'))
      if (recipe) return recipe as SchemaRecipe
    } catch { /* skip */ }
  }
  return null
}

function parseServings(yield_: string | number | undefined): number {
  if (!yield_) return 1
  const n = Number(String(yield_).match(/\d+/)?.[0])
  return n > 0 ? n : 1
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = getSettings(session.userId)
  if (!settings?.gemini_api_key) return NextResponse.json({ error: 'API key de Gemini requerida' }, { status: 400 })

  const { url } = await req.json()
  if (!url || typeof url !== 'string') return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalorieAI/3.0)' },
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'No se pudo descargar la página. Comprueba la URL.' }, { status: 422 })
  }

  const schema = extractSchema(html)

  let name: string
  let ingredients: string[]
  let servings: number

  if (schema && schema.recipeIngredient && schema.recipeIngredient.length > 0) {
    name = schema.name || 'Receta importada'
    ingredients = schema.recipeIngredient
    servings = parseServings(schema.recipeYield)
  } else {
    // Fallback: ask Gemini to extract from raw text
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 6000)
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(settings.gemini_api_key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const prompt = `Extract recipe info from this webpage text. Return ONLY valid JSON (no markdown):
{"name":"recipe name","ingredients":["ingredient 1","ingredient 2"],"servings":4}
If no recipe is found, return {"error":"no recipe found"}.
Text: ${text}`
    try {
      const result = await model.generateContent(prompt)
      const parsed = JSON.parse(result.response.text().replace(/```json\n?|```\n?/g, '').trim())
      if (parsed.error) return NextResponse.json({ error: 'No se encontró ninguna receta en esa URL' }, { status: 422 })
      name = parsed.name || 'Receta importada'
      ingredients = parsed.ingredients || []
      servings = Number(parsed.servings) || 1
    } catch {
      return NextResponse.json({ error: 'No se pudo extraer la receta. Prueba con otra URL.' }, { status: 422 })
    }
  }

  // Now analyze nutritionally
  const nutrition = await analyzeRecipe(name, ingredients, servings, settings.gemini_api_key)
  return NextResponse.json({ name, ingredients, servings, nutrition })
}
