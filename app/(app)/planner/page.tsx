'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Recipe { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servings: number; ingredients: string }
interface MealPlan { id: string; date: string; recipe_id: string; servings: number; meal_type: string }
interface PlanWithRecipe extends MealPlan { recipe?: Recipe }
interface ShoppingItem { id: string; name: string; checked: number }

const DIAS_FULL = ['Lunes','Martes','MiÃ©rcoles','Jueves','Viernes','SÃ¡bado','Domingo']
const MEAL_TYPES = ['breakfast','lunch','dinner','snack']
const MEAL_LABELS: Record<string,string> = { breakfast:'Desayuno', lunch:'Almuerzo', dinner:'Cena', snack:'TentempiÃ©' }

function getWeekDays(offset = 0): string[] {
  const now = new Date()
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dow + i + offset * 7)
    return d.toISOString().split('T')[0]
  })
}

export default function PlannerPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [plans, setPlans] = useState<PlanWithRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null) // date being added to
  const [selectedMealType, setSelectedMealType] = useState('lunch')
  const [showShopping, setShowShopping] = useState(false)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [manualShoppingItems, setManualShoppingItems] = useState<ShoppingItem[]>([])
  const [newShoppingItem, setNewShoppingItem] = useState('')

  const weekDays = getWeekDays(weekOffset)
  const start = weekDays[0]
  const end   = weekDays[6]
  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    setLoading(true)
    const [recipesRes, plansRes, shoppingRes] = await Promise.all([
      fetch('/api/recetario').then(r => r.json()),
      fetch(`/api/planner?start=${start}&end=${end}`).then(r => r.json()),
      fetch('/api/shopping').then(r => r.json()),
    ])
    const recs: Recipe[] = recipesRes.recipes || []
    const pls: MealPlan[] = plansRes.plans || []
    setRecipes(recs)
    const recipeMap = Object.fromEntries(recs.map((r: Recipe) => [r.id, r]))
    setPlans(pls.map(p => ({ ...p, recipe: recipeMap[p.recipe_id] })))
    setManualShoppingItems(shoppingRes.items || [])
    setLoading(false)
  }, [start, end])

  useEffect(() => { loadData() }, [loadData])

  async function addPlan(date: string, recipeId: string, servings = 1) {
    const res = await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, recipe_id: recipeId, servings, meal_type: selectedMealType }),
    })
    const data = await res.json()
    if (res.ok) {
      const recipe = recipes.find(r => r.id === recipeId)
      setPlans(prev => [...prev, { ...data.plan, recipe }])
      setAdding(null)
    }
  }

  async function removePlan(id: string) {
    await fetch('/api/planner', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  async function addShoppingItem() {
    const name = newShoppingItem.trim()
    if (!name) return
    const res = await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      setManualShoppingItems(prev => [data.item, ...prev])
      setNewShoppingItem('')
    }
  }

  async function toggleShoppingItem(item: ShoppingItem) {
    const checked = item.checked ? 0 : 1
    setManualShoppingItems(prev => prev.map(i => i.id === item.id ? { ...i, checked } : i))
    await fetch('/api/shopping', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, checked: !!checked }),
    })
  }

  async function removeShoppingItem(id: string) {
    setManualShoppingItems(prev => prev.filter(i => i.id !== id))
    await fetch('/api/shopping', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  // Shopping list: all ingredients from planned recipes
  const plannedShoppingItems = plans
    .filter(p => p.recipe)
    .flatMap(p => {
      try { return Array.isArray(p.recipe!.ingredients) ? p.recipe!.ingredients as unknown as string[] : JSON.parse(p.recipe!.ingredients) as string[] }
      catch { return [] }
    })

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))

  return (
    <div className="liquid-page max-w-lg mx-auto min-h-screen">
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 header-glass">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Planificador</h1>
              <p className="text-xs text-white/40">Organiza tus comidas semanales</p>
            </div>
          </div>
          <button onClick={() => setShowShopping(true)}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-semibold text-white/70 flex items-center gap-1.5">
            ðŸ›’ Lista
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)} className="glass-btn w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="text-sm font-semibold text-white/70">
            {new Date(start + 'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})} â€“ {new Date(end+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
          </p>
          <button onClick={() => setWeekOffset(w => w + 1)} className="glass-btn w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-32">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          weekDays.map((date, idx) => {
            const dayPlans = plans.filter(p => p.date === date)
            const isToday = date === today
            const isPast = date < today
            const dayTotal = dayPlans.reduce((s, p) => s + (p.recipe ? Math.round(p.recipe.calories * p.servings / p.recipe.servings) : 0), 0)

            return (
              <div key={date} className="glass rounded-2xl overflow-hidden" style={{ opacity: isPast ? 0.7 : 1 }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: isToday ? 'rgba(10,132,255,0.08)' : 'transparent', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: isToday ? '#0A84FF' : 'rgba(235,235,245,0.8)' }}>{DIAS_FULL[idx]}</span>
                    <span className="text-xs text-white/35">{new Date(date+'T12:00:00').getDate()}</span>
                    {isToday && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0A84FF]/20 text-[#0A84FF]">HOY</span>}
                  </div>
                  {dayTotal > 0 && <span className="text-xs font-semibold text-white/50 tabular-nums">{dayTotal} kcal</span>}
                </div>

                <div className="px-3 py-2 space-y-1.5">
                  {dayPlans.map(plan => (
                    <div key={plan.id} className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/30 font-semibold uppercase">{MEAL_LABELS[plan.meal_type]}</span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight truncate">{plan.recipe?.name || 'Receta eliminada'}</p>
                        {plan.recipe && (
                          <p className="text-[10px] text-white/35">{plan.servings} raciÃ³n Â· {Math.round(plan.recipe.calories * plan.servings / plan.recipe.servings)} kcal</p>
                        )}
                      </div>
                      <button onClick={() => removePlan(plan.id)} className="h-6 w-6 rounded-lg flex items-center justify-center text-white/25 active:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}

                  <button onClick={() => setAdding(date)}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-white/30 active:text-white/60 active:bg-white/5 transition-all flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                    AÃ±adir receta
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add recipe modal */}
      {adding && (
        <div className="fixed inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setAdding(null)}>
          <div className="glass-strong w-full max-w-lg mx-auto rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">AÃ±adir al {new Date(adding+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long'})}</h3>
              <button onClick={() => setAdding(null)} className="text-white/40 text-xl">Ã—</button>
            </div>

            <div className="flex gap-1.5">
              {MEAL_TYPES.map(t => (
                <button key={t} onClick={() => setSelectedMealType(t)}
                  className="flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all"
                  style={{ background: selectedMealType === t ? 'rgba(10,132,255,0.15)' : 'transparent', border: selectedMealType === t ? '0.5px solid rgba(10,132,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)', color: selectedMealType === t ? '#0A84FF' : 'rgba(235,235,245,0.4)' }}>
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>

            <input value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
              placeholder="Buscar recetaâ€¦"
              className="glass-input px-3 py-2.5 rounded-xl text-sm w-full" />

            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-none">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-white/30">No tienes recetas guardadas aÃºn</p>
                  <button onClick={() => { setAdding(null); router.push('/recetario') }} className="mt-2 text-xs text-[#0A84FF]">Ir al Recetario â†’</button>
                </div>
              ) : filteredRecipes.map(r => (
                <button key={r.id} onClick={() => addPlan(adding, r.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:bg-white/10 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                    <p className="text-xs text-white/35">{Math.round(r.calories)} kcal Â· P{Math.round(r.protein)}g C{Math.round(r.carbs)}g G{Math.round(r.fat)}g</p>
                  </div>
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shopping list modal */}
      {showShopping && (
        <div className="fixed inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowShopping(false)}>
          <div className="glass-strong w-full max-w-lg mx-auto rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">ðŸ›’ Lista de la compra</h3>
              <button onClick={() => setShowShopping(false)} className="text-white/40 text-xl">Ã—</button>
            </div>
            <p className="text-xs text-white/40">Ingredientes del plan semanal y cosas que añadas a mano</p>
            <div className="flex gap-2">
              <input value={newShoppingItem} onChange={e => setNewShoppingItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addShoppingItem() }} placeholder="Añadir algo a mano..." className="glass-input flex-1 px-3 py-2.5 rounded-xl text-sm" />
              <button onClick={addShoppingItem} className="bg-[#0A84FF] text-white px-4 rounded-xl text-sm font-bold">+</button>
            </div>
            {plannedShoppingItems.length === 0 && manualShoppingItems.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-white/30">No hay ingredientes aún</p></div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none">
                {manualShoppingItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2">Añadidos por ti</p>
                    {manualShoppingItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-2.5 px-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => toggleShoppingItem(item)} className={`w-4 h-4 rounded-md border flex-shrink-0 ${item.checked ? 'bg-[#32D74B] border-[#32D74B]' : 'border-white/20'}`} />
                        <span className={`flex-1 text-sm ${item.checked ? 'text-white/35 line-through' : 'text-white/80'}`}>{item.name}</span>
                        <button onClick={() => removeShoppingItem(item.id)} className="text-white/25 text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {plannedShoppingItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2">Del plan semanal</p>
                    {plannedShoppingItems.map((item, i) => (
                      <div key={`${item}-${i}`} className="flex items-center gap-3 py-2.5 px-2" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-4 h-4 rounded-md border border-white/20 flex-shrink-0" />
                        <span className="text-sm text-white/80">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
