import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

function cleanBrand(brands: string): string {
  return brands.split(',')[0].trim()
}

function cleanName(raw: string, brand: string): string {
  let name = raw.trim()
  // Remove brand prefix if present (case-insensitive)
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.slice(brand.length).replace(/^[\s,\-–]+/, '').trim()
  }
  if (!name) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function detectUnit(servingSize: string): 'ml' | 'g' {
  return /ml|mL|cl|dl|litre|liter|litro/i.test(servingSize) ? 'ml' : 'g'
}

function productEmoji(name: string): string {
  const t = name.toLowerCase()
  if (/leche|milk|lácteo|yogur|queso|cheese|kefir|nata|cream/.test(t)) return '🥛'
  if (/avena|oat|cereal|granola|muesli/.test(t)) return '🥣'
  if (/agua|water/.test(t)) return '💧'
  if (/zumo|jugo|juice/.test(t)) return '🧃'
  if (/café|coffee|espresso/.test(t)) return '☕'
  if (/té|tea/.test(t)) return '🍵'
  if (/chocolate|cacao/.test(t)) return '🍫'
  if (/pan|bread|bakery|biscuit|galleta|cookie/.test(t)) return '🍞'
  if (/pasta|noodle|macarron/.test(t)) return '🍝'
  if (/arroz|rice/.test(t)) return '🍚'
  if (/pollo|chicken/.test(t)) return '🍗'
  if (/carne|meat|beef|ternera|cerdo/.test(t)) return '🥩'
  if (/pescado|fish|salmon|atun|tuna/.test(t)) return '🐟'
  if (/huevo|egg/.test(t)) return '🥚'
  if (/fruta|fruit|manzana|naranja|platano|fresa/.test(t)) return '🍎'
  if (/verdura|vegetal|vegetable|ensalada|salad/.test(t)) return '🥦'
  if (/aceite|oil/.test(t)) return '🫙'
  if (/chips|crisps|patatas fritas/.test(t)) return '🥔'
  if (/cerveza|beer/.test(t)) return '🍺'
  if (/vino|wine/.test(t)) return '🍷'
  if (/refresco|soda|cola/.test(t)) return '🥤'
  if (/helado|ice cream/.test(t)) return '🍦'
  if (/pizza/.test(t)) return '🍕'
  if (/hambur|burger/.test(t)) return '🍔'
  return '📦'
}

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = params
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_es,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url`,
      {
        headers: { 'User-Agent': 'CalorieAI/4.2 (self-hosted; contact@calorieai.app)' },
        signal: AbortSignal.timeout(8000),
      }
    )
    const data = await res.json()

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Producto no encontrado en la base de datos' }, { status: 404 })
    }

    const p = data.product
    const n = p.nutriments || {}
    const brand = p.brands ? cleanBrand(p.brands) : ''

    // Prefer Spanish name, then generic, then brand fallback
    const rawName = p.product_name_es || p.product_name || p.product_name_en || ''
    const name = cleanName(rawName, brand) || brand || 'Producto escaneado'

    const servingQ = Number(p.serving_quantity) || 100
    const unit = detectUnit(p.serving_size || '')

    // Per-100g values (always present, used for live recalculation when user adjusts quantity)
    const per100g = {
      calories: Math.round(Number(n['energy-kcal_100g'] ?? 0)),
      protein:  Math.round(Number(n['proteins_100g']        ?? 0) * 10) / 10,
      carbs:    Math.round(Number(n['carbohydrates_100g']   ?? 0) * 10) / 10,
      fat:      Math.round(Number(n['fat_100g']             ?? 0) * 10) / 10,
      fiber:    Math.round(Number(n['fiber_100g']           ?? 0) * 10) / 10,
    }

    // Default serving values (prefer explicit per-serving fields, fallback to calculated)
    const cal  = Number(n['energy-kcal_serving']       ?? per100g.calories * servingQ / 100)
    const prot = Number(n['proteins_serving']          ?? per100g.protein  * servingQ / 100)
    const carb = Number(n['carbohydrates_serving']     ?? per100g.carbs    * servingQ / 100)
    const fat  = Number(n['fat_serving']               ?? per100g.fat      * servingQ / 100)
    const fib  = Number(n['fiber_serving']             ?? per100g.fiber    * servingQ / 100)

    return NextResponse.json({
      product: {
        name,
        brand,
        portion: p.serving_size || `${servingQ}${unit}`,
        quantity: servingQ,
        unit,
        calories: Math.round(cal),
        protein:  Math.round(prot * 10) / 10,
        carbs:    Math.round(carb * 10) / 10,
        fat:      Math.round(fat  * 10) / 10,
        fiber:    Math.round(fib  * 10) / 10,
        per100g,
        emoji: productEmoji(name),
        image: p.image_front_small_url || null,
        barcode: code,
      }
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo contactar con Open Food Facts' }, { status: 503 })
  }
}
