import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createShoppingItem, deleteShoppingItem, getShoppingItems, updateShoppingItem } from '@/lib/db'
import { v4 as uuid } from 'uuid'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ items: getShoppingItems(session.userId) })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  const cleanName = String(name || '').trim()
  if (!cleanName) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const item = { id: uuid(), user_id: session.userId, name: cleanName, checked: 0 }
  createShoppingItem(item)
  return NextResponse.json({ item: { ...item, created_at: Math.floor(Date.now() / 1000) } })
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, checked } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  updateShoppingItem(id, session.userId, !!checked)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  deleteShoppingItem(id, session.userId)
  return NextResponse.json({ ok: true })
}
