import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMealsByDate, getDailyStats, getWater, createMeal } from '@/lib/db'
import { todayString } from '@/lib/nutrition'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file     = formData.get('image') as File | null
    const mealType = (formData.get('meal_type') as string) || 'snack'
    const date     = (formData.get('date') as string) || todayString()
    const rawAnalysis = formData.get('analysis') as string | null

    if (!file || !rawAnalysis) {
      return NextResponse.json({ error: 'Missing image or analysis' }, { status: 400 })
    }

    const analysis = JSON.parse(rawAnalysis)

    // Save photo to disk
    const bytes    = await file.arrayBuffer()
    const buffer   = Buffer.from(bytes)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    fs.mkdirSync(uploadsDir, { recursive: true })
    const ext      = file.type.split('/')[1] || 'jpg'
    const filename = `${uuid()}.${ext}`
    fs.writeFileSync(path.join(uploadsDir, filename), buffer)

    const meal = {
      id:         uuid(),
      user_id:    session.userId,
      date,
      photo_path: `/uploads/${filename}`,
      name:       analysis.foods.map((f: { name: string }) => f.name).join(', '),
      foods:      JSON.stringify(analysis.foods),
      calories:   analysis.total_calories,
      protein:    analysis.total_protein,
      carbs:      analysis.total_carbs,
      fat:        analysis.total_fat,
      fiber:      analysis.total_fiber ?? 0,
      meal_type:  mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      notes:      analysis.notes ?? '',
    }

    createMeal(meal)
    return NextResponse.json({ meal: { ...meal, foods: analysis.foods } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || todayString()

  const meals = getMealsByDate(session.userId, date)
  const stats = getDailyStats(session.userId, date)
  const water = getWater(session.userId, date)

  const parsed = meals.map(m => ({ ...m, foods: JSON.parse(m.foods) }))
  return NextResponse.json({ meals: parsed, stats, water, date })
}
