'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface FoodItem { name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }
interface Recipe {
  id: string; name: string; description: string | null
  ingredients: string[]; instructions: string | null; foods: FoodItem[]
  calories: number; protein: number; carbs: number; fat: number; fiber: number
  servings: number; photo_path: string | null
}

export default function RecetarioPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [logging, setLogging] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', ingredients: '', instructions: '', servings: '1' })
  const [formPhoto, setFormPhoto] = useState<File | null>(null)
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [formError, setFormError] = useState('')
  const formPhotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/recetario').then(r => r.json()).then(d => { setRecipes(d.recipes || []); setLoading(false) })
  }, [])

  const handleFormPhoto = useCallback((f: File) => {
    setFormPhoto(f)
    const reader = new FileReader()
    reader.onloadend = () => setFormPhotoPreview(reader.result as string)
    reader.readAsDataURL(f)
  }, [])

  async function submitRecipe(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    const ings = form.ingredients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!form.name.trim() || ings.length === 0) { setFormError('Nombre e ingredientes son obligatorios'); return }
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim()); fd.append('description', form.description.trim())
      fd.append('ingredients', JSON.stringify(ings)); fd.append('instructions', form.instructions.trim())
      fd.append('servings', form.servings || '1')
      if (formPhoto) fd.append('photo', formPhoto)
      const res = await fetch('/api/recetario', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Error al crear receta'); setAnalyzing(false); return }
      setRecipes(prev => [data.recipe, ...prev])
      setShowForm(false); setForm({ name: '', description: '', ingredients: '', instructions: '', servings: '1' })
      setFormPhoto(null); setFormPhotoPreview(null)
    } catch { setFormError('Error del servidor') }
    setAnalyzing(false)
  }

  async function logAsFood(recipe: Recipe) {
    setLogging(recipe.id)
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/meals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        meal_type: 'snack',
        name: recipe.name,
        foods: recipe.foods,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        fiber: recipe.fiber,
        notes: 'Añadido desde el recetario',
      }),
    })
    setLogging(null)
    if (res.ok) router.push('/')
    else setFormError('No se pudo registrar la receta como comida')
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta receta?')) return
    setDeleting(id); await fetch(`/api/recetario/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id)); setDeleting(null)
  }

  async function uploadDishPhoto(recipeId: string, file: File) {
    setUploadingPhoto(recipeId)
    const fd = new FormData(); fd.append('photo', file)
    const res = await fetch(`/api/recetario/${recipeId}`, { method: 'PATCH', body: fd })
    const data = await res.json()
    if (res.ok) setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, photo_path: data.photo_path } : r))
    setUploadingPhoto(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 flex items-center justify-between header-glass">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Recetario</h1>
          <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest">{recipes.length} receta{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl active:scale-95 transition-transform" style={{ boxShadow: '0 0 16px rgba(249,115,22,0.35)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nueva
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {recipes.length === 0 && (
          <div className="glass-strong rounded-3xl p-10 text-center mt-4">
            <div className="text-5xl mb-3">📖</div>
            <p className="font-bold text-zinc-200 text-lg">Tu recetario está vacío</p>
            <p className="text-sm text-zinc-500 mt-1 mb-5">Guarda recetas y la IA calculará los valores nutricionales</p>
            <button onClick={() => setShowForm(true)} className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-2xl text-sm active:scale-95 transition-transform" style={{ boxShadow: '0 0 16px rgba(249,115,22,0.35)' }}>Añadir primera receta</button>
          </div>
        )}

        {recipes.map(recipe => (
          <div key={recipe.id} className="glass rounded-2xl overflow-hidden animate-fade-in">
            {recipe.photo_path && (
              <div className="relative w-full h-44">
                <Image src={recipe.photo_path} alt={recipe.name} fill className="object-cover" sizes="500px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <p className="font-bold text-white text-lg">{recipe.name}</p>
                  <p className="text-white/60 text-xs">{recipe.servings} ración{recipe.servings !== 1 ? 'es' : ''}</p>
                </div>
              </div>
            )}
            <div className="p-4">
              {!recipe.photo_path && (
                <div className="flex justify-between items-start mb-3">
                  <div><h3 className="font-bold text-zinc-100">{recipe.name}</h3><p className="text-xs text-zinc-500 mt-0.5">{recipe.servings} ración{recipe.servings !== 1 ? 'es' : ''}</p></div>
                  <div className="text-right"><div className="text-xl font-bold text-zinc-100">{Math.round(recipe.calories)}</div><div className="text-xs text-zinc-500">kcal/ración</div></div>
                </div>
              )}
              {recipe.photo_path && <p className="text-sm font-bold text-brand-400 mb-3">{Math.round(recipe.calories)} kcal/ración</p>}

              <div className="flex gap-2 mb-3">
                {[['P', recipe.protein, 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'], ['C', recipe.carbs, 'bg-orange-500/15 text-orange-400 border-orange-500/20'], ['G', recipe.fat, 'bg-red-500/15 text-red-400 border-red-500/20']].map(([l, v, c]) => (
                  <span key={l as string} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${c}`}>{l} {Math.round(v as number)}g</span>
                ))}
              </div>

              <button onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)} className="text-xs text-brand-500 font-semibold flex items-center gap-1.5 mb-3">
                <svg className={`w-3.5 h-3.5 transition-transform ${expanded === recipe.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                {expanded === recipe.id ? 'Ocultar detalles' : 'Ver detalles'}
              </button>

              {expanded === recipe.id && (
                <div className="space-y-3 animate-fade-in mb-3">
                  {recipe.description && <p className="text-sm text-zinc-400 italic">{recipe.description}</p>}
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Ingredientes</p>
                    <ul className="space-y-1">{recipe.ingredients.map((ing, i) => <li key={i} className="text-sm text-zinc-300 flex items-start gap-2"><span className="text-brand-500 mt-0.5">•</span>{ing}</li>)}</ul>
                  </div>
                  {recipe.foods.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Análisis nutricional IA</p>
                      <div className="space-y-1.5">
                        {recipe.foods.map((f, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div><div className="text-sm text-zinc-200 font-medium">{f.name}</div><div className="text-xs text-zinc-600">{f.portion}</div></div>
                            <div className="text-sm font-bold text-zinc-400">{f.calories} kcal</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recipe.instructions && <div><p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Instrucciones</p><p className="text-sm text-zinc-400 leading-relaxed">{recipe.instructions}</p></div>}
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Foto del plato</p>
                    <button onClick={() => { photoTarget.current = recipe.id; photoRef.current?.click() }} disabled={uploadingPhoto === recipe.id}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ border: '1px dashed rgba(255,255,255,0.15)', color: '#a1a1aa' }}>
                      {uploadingPhoto === recipe.id ? <><div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />Subiendo…</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>{recipe.photo_path ? 'Cambiar foto' : 'Subir foto del plato'}</>}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => logAsFood(recipe)} disabled={logging === recipe.id} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60" style={{ boxShadow: '0 0 12px rgba(34,197,94,0.25)' }}>
                  {logging === recipe.id ? 'Registrando…' : '+ Añadir como comida'}
                </button>
                <button onClick={() => handleDelete(recipe.id)} disabled={deleting === recipe.id} className="px-3 py-2.5 rounded-xl text-red-500 text-sm font-medium active:scale-95" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                  {deleting === recipe.id ? '…' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && photoTarget.current) uploadDishPhoto(photoTarget.current, f); e.target.value = '' }} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl overflow-hidden animate-slide-up" style={{ background: 'linear-gradient(180deg,rgba(25,25,45,0.98) 0%,rgba(18,18,32,1) 100%)', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="px-5 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-lg font-bold text-zinc-100">Nueva receta</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={submitRecipe} className="p-5 space-y-4">
              {formPhotoPreview && (
                <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                  <Image src={formPhotoPreview} alt="preview" fill className="object-cover" />
                  <button type="button" onClick={() => { setFormPhoto(null); setFormPhotoPreview(null) }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              {[
                { key: 'name', label: 'Nombre de la receta *', type: 'text', placeholder: 'Ej: Tortilla española', required: true },
                { key: 'description', label: 'Descripción (opcional)', type: 'text', placeholder: 'Breve descripción del plato', required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">{f.label}</label>
                  <input type={f.type} required={f.required} value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-2xl text-zinc-100 placeholder:text-zinc-600 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Ingredientes * <span className="text-zinc-700 font-normal">(uno por línea)</span></label>
                <textarea required rows={5} value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))} placeholder={"3 huevos\n400g patatas\n1 cebolla\nAceite de oliva\nSal"}
                  className="w-full px-4 py-3 rounded-2xl text-zinc-100 placeholder:text-zinc-600 text-sm outline-none resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Instrucciones (opcional)</label>
                <textarea rows={3} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Pasos de preparación…"
                  className="w-full px-4 py-3 rounded-2xl text-zinc-100 placeholder:text-zinc-600 text-sm outline-none resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Raciones</label>
                  <input type="number" min="1" value={form.servings} onChange={e => setForm(p => ({ ...p, servings: e.target.value }))} className="w-full px-4 py-3 rounded-2xl text-zinc-100 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Foto del plato</label>
                  <button type="button" onClick={() => formPhotoRef.current?.click()} className="w-full px-3 py-3 rounded-2xl text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: formPhoto ? '#4ade80' : '#a1a1aa' }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    {formPhoto ? 'Lista ✓' : 'Añadir'}
                  </button>
                </div>
              </div>
              <input ref={formPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFormPhoto(e.target.files[0])} />
              {formError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{formError}</div>}
              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-2xl text-zinc-400 font-semibold text-sm border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                <button type="submit" disabled={analyzing} className="flex-1 py-3.5 rounded-2xl bg-brand-500 text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2" style={{ boxShadow: '0 0 16px rgba(249,115,22,0.35)' }}>
                  {analyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analizando…</> : '🤖 Guardar receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
