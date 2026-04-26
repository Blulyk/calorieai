import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteMeal, getMealById } from '@/lib/db'
import fs from 'fs'
import path from 'path'

function deleteUpload(photoPath: string) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const filename = path.basename(photoPath)
  const target = path.join(uploadsDir, filename)

  if (!target.startsWith(uploadsDir + path.sep)) return
  try { fs.unlinkSync(target) } catch {}
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meal = getMealById(params.id, session.userId)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (meal.photo_path) {
    deleteUpload(meal.photo_path)
  }

  deleteMeal(params.id, session.userId)
  return NextResponse.json({ ok: true })
}
