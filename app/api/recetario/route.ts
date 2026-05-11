import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getRecipes, createRecipe, getSettings } from '@/lib/db'
import { analyzeRecipe, suggestRecipeEmoji } from '@/lib/gemini'
import { saveOptimizedUpload } from '@/lib/uploads'
import { v4 as uuid } from 'uuid'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const recipes = getRecipes(session.userId)
  return NextResponse.json({ recipes: recipes.map(r => ({ ...r, foods: JSON.parse(r.foods), ingredients: JSON.parse(r.ingredients) })) })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const contentType = req.headers.get('content-type') || ''
    let name = '', description = '', ingredients: string[] = [], instructions = '', servings = 1, photoFile: File | null = null
    let manualNutrition: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number } | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      name = form.get('name') as string
      description = form.get('description') as string || ''
      ingredients = JSON.parse(form.get('ingredients') as string || '[]')
      instructions = form.get('instructions') as string || ''
      servings = parseInt(form.get('servings') as string || '1')
      photoFile = form.get('photo') as File | null
      manualNutrition = JSON.parse(form.get('manual_nutrition') as string || 'null')
    } else {
      const body = await req.json()
      name = body.name; description = body.description || ''; ingredients = body.ingredients || []; instructions = body.instructions || ''; servings = body.servings || 1
      manualNutrition = body.manual_nutrition || null
    }

    if (!name || !ingredients.length) return NextResponse.json({ error: 'Nombre e ingredientes requeridos' }, { status: 400 })

    const hasManualNutrition = !!manualNutrition && Number(manualNutrition.calories) > 0
    const settings = getSettings(session.userId)
    if (!hasManualNutrition && !settings?.gemini_api_key) return NextResponse.json({ error: 'Configura tu API key de Gemini o introduce calorias manualmente' }, { status: 400 })

    const analysis = hasManualNutrition
      ? buildManualRecipeAnalysis(name, ingredients, manualNutrition!)
      : await analyzeRecipe(name, ingredients, servings, settings!.gemini_api_key!, description, instructions)

    let photoPath: string | null = null
    if (photoFile && photoFile.size > 0) {
      if (!photoFile.type.startsWith('image/')) {
        return NextResponse.json({ error: 'La foto debe ser una imagen' }, { status: 400 })
      }
      photoPath = await saveOptimizedUpload(photoFile, 'recipe')
    }

    // Generate emoji for recipes without a photo
    let emoji: string | null = null
    if (!photoPath && settings?.gemini_api_key) {
      emoji = await suggestRecipeEmoji(name, ingredients, settings.gemini_api_key)
    }

    const id = uuid()
    createRecipe({
      id, user_id: session.userId, name, description, instructions,
      ingredients: JSON.stringify(ingredients),
      foods: JSON.stringify(analysis.foods),
      calories: analysis.total_calories, protein: analysis.total_protein,
      carbs: analysis.total_carbs, fat: analysis.total_fat, fiber: analysis.total_fiber,
      servings, photo_path: photoPath, emoji,
    })

    const recipe = { id, name, description, ingredients, instructions, foods: analysis.foods, calories: analysis.total_calories, protein: analysis.total_protein, carbs: analysis.total_carbs, fat: analysis.total_fat, fiber: analysis.total_fiber, servings, photo_path: photoPath, emoji }
    return NextResponse.json({ recipe, analysis })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 })
  }
}

function buildManualRecipeAnalysis(name: string, ingredients: string[], nutrition: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }) {
  const calories = Number(nutrition.calories) || 0
  const protein = Number(nutrition.protein) || 0
  const carbs = Number(nutrition.carbs) || 0
  const fat = Number(nutrition.fat) || 0
  const fiber = Number(nutrition.fiber) || 0
  return {
    foods: ingredients.map(ingredient => ({
      name: ingredient,
      portion: 'Incluido en la receta',
      calories: Math.round(calories / Math.max(1, ingredients.length)),
      protein: Math.round((protein / Math.max(1, ingredients.length)) * 10) / 10,
      carbs: Math.round((carbs / Math.max(1, ingredients.length)) * 10) / 10,
      fat: Math.round((fat / Math.max(1, ingredients.length)) * 10) / 10,
      fiber: Math.round((fiber / Math.max(1, ingredients.length)) * 10) / 10,
    })),
    total_calories: calories,
    total_protein: protein,
    total_carbs: carbs,
    total_fat: fat,
    total_fiber: fiber,
    notes: `Valores introducidos manualmente para ${name}.`,
  }
}
