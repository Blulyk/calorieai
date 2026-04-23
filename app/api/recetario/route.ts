import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getRecipes, createRecipe, getSettings } from '@/lib/db'
import { analyzeRecipe } from '@/lib/gemini'
import { v4 as uuid } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      name = form.get('name') as string
      description = form.get('description') as string || ''
      ingredients = JSON.parse(form.get('ingredients') as string || '[]')
      instructions = form.get('instructions') as string || ''
      servings = parseInt(form.get('servings') as string || '1')
      photoFile = form.get('photo') as File | null
    } else {
      const body = await req.json()
      name = body.name; description = body.description || ''; ingredients = body.ingredients || []; instructions = body.instructions || ''; servings = body.servings || 1
    }

    if (!name || !ingredients.length) return NextResponse.json({ error: 'Nombre e ingredientes requeridos' }, { status: 400 })

    const settings = getSettings(session.userId)
    if (!settings?.gemini_api_key) return NextResponse.json({ error: 'Configura tu API key de Gemini primero' }, { status: 400 })

    const analysis = await analyzeRecipe(name, ingredients, servings, settings.gemini_api_key)

    let photoPath: string | null = null
    if (photoFile && photoFile.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const filename = `recipe_${uuid()}.${ext}`
      const buffer = Buffer.from(await photoFile.arrayBuffer())
      await writeFile(path.join(uploadsDir, filename), buffer)
      photoPath = `/uploads/${filename}`
    }

    const id = uuid()
    createRecipe({
      id, user_id: session.userId, name, description, instructions,
      ingredients: JSON.stringify(ingredients),
      foods: JSON.stringify(analysis.foods),
      calories: analysis.total_calories, protein: analysis.total_protein,
      carbs: analysis.total_carbs, fat: analysis.total_fat, fiber: analysis.total_fiber,
      servings, photo_path: photoPath,
    })

    const recipe = { id, name, description, ingredients, instructions, foods: analysis.foods, calories: analysis.total_calories, protein: analysis.total_protein, carbs: analysis.total_carbs, fat: analysis.total_fat, fiber: analysis.total_fiber, servings, photo_path: photoPath }
    return NextResponse.json({ recipe, analysis })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 })
  }
}
