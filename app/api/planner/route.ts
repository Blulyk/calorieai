import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMealPlans, upsertMealPlan, deleteMealPlan } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start') || new Date().toISOString().split('T')[0]
  const end   = searchParams.get('end')   || start
  return NextResponse.json({ plans: getMealPlans(session.userId, start, end) })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date, recipe_id, servings = 1, meal_type = 'lunch' } = await req.json()
  if (!date || !recipe_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const plan = { id: uuid(), user_id: session.userId, date, recipe_id, servings: Number(servings), meal_type }
  upsertMealPlan(plan)
  return NextResponse.json({ plan })
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  deleteMealPlan(id, session.userId)
  return NextResponse.json({ ok: true })
}
