'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FoodItem {
  name: string; portion: string; calories: number
  protein: number; carbs: number; fat: number
}
interface Meal {
  id: string; name: string | null; photo_path: string | null; foods: FoodItem[]
  calories: number; protein: number; carbs: number; fat: number
  meal_type: string; notes: string | null; created_at: number
}
interface Props { meal: Meal; onDelete?: (id: string) => void; index?: number }

const MEAL_META: Record<string, { label: string; icon: string; color: string }> = {
  breakfast: { label: 'Desayuno', icon: 'AM', color: '#ffb84d' },
  lunch: { label: 'Almuerzo', icon: 'PM', color: '#38bdf8' },
  dinner: { label: 'Cena', icon: 'NT', color: '#a78bfa' },
  snack: { label: 'Snack', icon: 'SN', color: '#fb7185' },
}

export default function MealCard({ meal, onDelete, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const meta = MEAL_META[meal.meal_type] || MEAL_META.snack
  const time = new Date(meal.created_at * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  async function handleDelete() {
    if (!confirm('¿Eliminar esta comida?')) return
    setDeleting(true)
    await fetch(`/api/meals/${meal.id}`, { method: 'DELETE' })
    onDelete?.(meal.id)
  }

  return (
    <article className="glass liquid-card animate-fadeInUp overflow-hidden" style={{ animationDelay: `${index * 0.06}s` }}>
      {meal.photo_path && (
        <div className="relative h-48 w-full">
          <Image src={meal.photo_path} alt={meal.name || 'Foto comida'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-white/8" />
          <div className="absolute left-4 top-4 glass-pill rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-lg font-bold leading-tight text-white">{meal.name || 'Comida'}</h3>
              <p className="mt-1 text-xs font-medium text-white/55">{time}</p>
            </div>
            <div className="glass-pill rounded-2xl px-3 py-2 text-right">
              <p className="text-2xl font-bold leading-none text-white tabular-nums">{Math.round(meal.calories)}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/48">kcal</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {!meal.photo_path && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="glass-pill flex h-11 w-11 items-center justify-center rounded-2xl text-[10px] font-black tracking-wider" style={{ color: meta.color }}>
                {meta.icon}
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-base font-bold text-white">{meal.name || 'Comida'}</h3>
                <p className="mt-0.5 text-xs text-white/45">{meta.label} · {time}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold leading-none text-white tabular-nums">{Math.round(meal.calories)}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/38">kcal</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {[
            { label: 'P', value: meal.protein, color: '#93c5fd' },
            { label: 'C', value: meal.carbs, color: '#fdba74' },
            { label: 'G', value: meal.fat, color: '#fda4af' },
          ].map(m => (
            <span key={m.label} className="glass-pill rounded-full px-3 py-1 text-xs font-bold" style={{ color: m.color }}>
              {m.label} {Math.round(m.value)}g
            </span>
          ))}
        </div>

        {meal.foods.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-100/90">
            <span>{expanded ? 'Ocultar detalles' : `${meal.foods.length} ingrediente${meal.foods.length !== 1 ? 's' : ''}`}</span>
            <svg className="h-3.5 w-3.5 transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        <div style={{ maxHeight: expanded ? `${meal.foods.length * 66 + 44}px` : '0px', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="mt-3 space-y-0 rounded-2xl bg-black/12 px-3">
            {meal.foods.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: i < meal.foods.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-white/88">{f.name}</p>
                  <p className="mt-0.5 text-xs text-white/40">{f.portion}</p>
                </div>
                <p className="text-sm font-bold text-white/70 tabular-nums">{f.calories} kcal</p>
              </div>
            ))}
            {meal.notes && <p className="pb-3 pt-1 text-xs italic text-white/42">{meal.notes}</p>}
          </div>
        </div>

        <button onClick={handleDelete} disabled={deleting} className="mt-4 text-xs font-semibold text-white/32 transition-colors hover:text-red-300 disabled:opacity-50">
          {deleting ? 'Eliminando...' : 'Eliminar comida'}
        </button>
      </div>
    </article>
  )
}
