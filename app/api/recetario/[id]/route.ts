import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteRecipe, getRecipeById, updateRecipePhoto } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import fs from 'fs'
import { v4 as uuid } from 'uuid'
import path from 'path'

function deleteUpload(photoPath: string | null) {
  if (!photoPath) return

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const filename = path.basename(photoPath)
  const target = path.join(uploadsDir, filename)

  if (!target.startsWith(uploadsDir + path.sep)) return
  try { fs.unlinkSync(target) } catch {}
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const recipe = getRecipeById(params.id, session.userId)
  if (!recipe) return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 })
  deleteUpload(recipe.photo_path)
  deleteRecipe(params.id, session.userId)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const recipe = getRecipeById(params.id, session.userId)
  if (!recipe) return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 })
  try {
    const form = await req.formData()
    const photoFile = form.get('photo') as File | null
    if (!photoFile || photoFile.size === 0) return NextResponse.json({ error: 'No se adjuntó foto' }, { status: 400 })
    if (!photoFile.type.startsWith('image/')) return NextResponse.json({ error: 'La foto debe ser una imagen' }, { status: 400 })
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const filename = `recipe_${uuid()}.${ext}`
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    await writeFile(path.join(uploadsDir, filename), buffer)
    const photoPath = `/uploads/${filename}`
    deleteUpload(recipe.photo_path)
    updateRecipePhoto(params.id, session.userId, photoPath)
    return NextResponse.json({ photo_path: photoPath })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
