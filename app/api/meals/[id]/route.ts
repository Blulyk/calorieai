import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteMeal, getMealById } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meal = getMealById(params.id, session.userId)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (meal.photo_path) {
    try { fs.unlinkSync(path.join(process.cwd(), 'public', meal.photo_path)) } catch {}
  }

  deleteMeal(params.id, session.userId)
  return NextResponse.json({ ok: true })
}
