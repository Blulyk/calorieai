import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = params
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,image_front_small_url`, {
      headers: { 'User-Agent': 'CalorieAI/3.0 (self-hosted; contact@calorieai.app)' },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Producto no encontrado en la base de datos' }, { status: 404 })
    }

    const p = data.product
    const n = p.nutriments || {}
    const servingG = Number(p.serving_quantity) || 100

    // Prefer per-serving values, fallback to per-100g * serving_size_g / 100
    const cal  = Number(n['energy-kcal_serving'] ?? (n['energy-kcal_100g'] ?? 0) * servingG / 100)
    const prot = Number(n['proteins_serving']    ?? (n['proteins_100g']    ?? 0) * servingG / 100)
    const carb = Number(n['carbohydrates_serving'] ?? (n['carbohydrates_100g'] ?? 0) * servingG / 100)
    const fat  = Number(n['fat_serving']          ?? (n['fat_100g']          ?? 0) * servingG / 100)
    const fib  = Number(n['fiber_serving']        ?? (n['fiber_100g']        ?? 0) * servingG / 100)

    return NextResponse.json({
      product: {
        name: p.product_name || p.brands || 'Producto escaneado',
        brand: p.brands || '',
        portion: p.serving_size || `${servingG}g`,
        calories: Math.round(cal),
        protein:  Math.round(prot * 10) / 10,
        carbs:    Math.round(carb * 10) / 10,
        fat:      Math.round(fat  * 10) / 10,
        fiber:    Math.round(fib  * 10) / 10,
        image:    p.image_front_small_url || null,
        barcode:  code,
      }
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'No se pudo contactar con Open Food Facts' }, { status: 503 })
  }
}
