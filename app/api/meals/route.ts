import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMealsByDate, getDailyStats, getWater, createMeal } from '@/lib/db'
import { todayString } from '@/lib/nutrition'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack'])

function normalizeMealType(value: unknown): MealType {
  return typeof value === 'string' && MEAL_TYPES.has(value as MealType)
    ? value as MealType
    : 'snack'
}

function asNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function saveImage(file: File): string {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })

  const ext = file.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg'
  const filename = `${uuid()}.${ext}`
  const target = path.join(uploadsDir, filename)

  return target
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      const foods = Array.isArray(body.foods) ? body.foods : []

      if (!body.name && foods.length === 0) {
        return NextResponse.json({ error: 'Missing meal name or foods' }, { status: 400 })
      }

      const meal = {
        id:         uuid(),
        user_id:    session.userId,
        date:       typeof body.date === 'string' ? body.date : todayString(),
        photo_path: null,
        name:       typeof body.name === 'string' ? body.name : foods.map((f: { name?: string }) => f.name).filter(Boolean).join(', '),
        foods:      JSON.stringify(foods),
        calories:   asNumber(body.calories),
        protein:    asNumber(body.protein),
        carbs:      asNumber(body.carbs),
        fat:        asNumber(body.fat),
        fiber:      asNumber(body.fiber),
        meal_type:  normalizeMealType(body.meal_type),
        notes:      typeof body.notes === 'string' ? body.notes : '',
      }

      createMeal(meal)
      return NextResponse.json({ meal: { ...meal, foods } })
    }

    const formData = await req.formData()
    const file     = formData.get('image') as File | null
    const mealType = normalizeMealType(formData.get('meal_type'))
    const date     = (formData.get('date') as string) || todayString()
    const rawAnalysis = formData.get('analysis') as string | null

    if (!file || !rawAnalysis) {
      return NextResponse.json({ error: 'Missing image or analysis' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const analysis = JSON.parse(rawAnalysis)

    // Save photo to disk
    const bytes    = await file.arrayBuffer()
    const buffer   = Buffer.from(bytes)
    const target   = saveImage(file)
    const filename = path.basename(target)
    fs.writeFileSync(target, buffer)

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
      meal_type:  mealType,
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
