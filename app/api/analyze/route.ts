import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, createMeal } from '@/lib/db'
import { analyzeFood } from '@/lib/gemini'
import { v4 as uuid } from 'uuid'
import { todayString } from '@/lib/nutrition'
import fs from 'fs'
import path from 'path'

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
  const date = (formData.get('date') as string) || todayString()
  const mealType = (formData.get('meal_type') as string) || 'snack'

  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')

  let analysis
  try {
    analysis = await analyzeFood(settings.gemini_api_key, base64, file.type)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 422 })
  }

  // Save photo to disk
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })
  const ext = file.type.split('/')[1] || 'jpg'
  const filename = `${uuid()}.${ext}`
  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  const photoPath = `/uploads/${filename}`

  const mealId = uuid()
  const meal = {
    id: mealId,
    user_id: session.userId,
    date,
    photo_path: photoPath,
    name: analysis.foods.map(f => f.name).join(', '),
    foods: JSON.stringify(analysis.foods),
    calories: analysis.total_calories,
    protein: analysis.total_protein,
    carbs: analysis.total_carbs,
    fat: analysis.total_fat,
    fiber: analysis.total_fiber,
    meal_type: (mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack') || analysis.meal_type_suggestion,
    notes: analysis.notes,
  }

  createMeal(meal)

  return NextResponse.json({
    meal: { ...meal, foods: analysis.foods },
    analysis,
  })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
