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

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
}

export default function MealCard({ meal, onDelete, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const time = new Date(meal.created_at * 1000).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  })

  async function handleDelete() {
    if (!confirm('¿Eliminar esta comida?')) return
    setDeleting(true)
    await fetch(`/api/meals/${meal.id}`, { method: 'DELETE' })
    onDelete?.(meal.id)
  }

  return (
    <div
      className="glass rounded-2xl overflow-hidden animate-fadeInUp"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {meal.photo_path && (
        <div className="relative w-full h-44">
          <Image src={meal.photo_path} alt={meal.name || 'Foto comida'} fill
            className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3 glass-pill w-8 h-8 rounded-xl flex items-center justify-center">
            <span className="text-sm">{MEAL_ICONS[meal.meal_type] || '🍽️'}</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div>
              <span className="text-white font-bold text-base leading-tight line-clamp-1">
                {meal.name || 'Comida'}
              </span>
              <div className="text-white/55 text-xs mt-0.5">{time}</div>
            </div>
            <div className="glass-pill rounded-xl px-3 py-1.5 text-right">
              <div className="text-white font-bold text-lg leading-none">{Math.round(meal.calories)}</div>
              <div className="text-white/55 text-xs">kcal</div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {!meal.photo_path && (
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2.5">
              <div className="glass-pill w-9 h-9 rounded-xl flex items-center justify-center">
                <span className="text-base">{MEAL_ICONS[meal.meal_type] || '🍽️'}</span>
              </div>
              <div>
                <div className="font-semibold text-zinc-100 text-sm">{meal.name || 'Comida'}</div>
                <div className="text-xs text-zinc-500">{time}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-zinc-100">{Math.round(meal.calories)}</div>
              <div className="text-xs text-zinc-500">kcal</div>
            </div>
          </div>
        )}

        {/* Macro badges */}
        <div className="flex gap-2">
          {[
            { label: 'P', value: meal.protein, color: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.25)', text: '#a5b4fc' },
            { label: 'C', value: meal.carbs,   color: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.25)', text: '#fdba74' },
            { label: 'F', value: meal.fat,     color: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.22)',  text: '#fca5a5' },
          ].map(m => (
            <span key={m.label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{
                background: m.color,
                border: `1px solid ${m.border}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                color: m.text,
              }}>
              {m.label} {Math.round(m.value)}g
            </span>
          ))}
        </div>

        {meal.foods.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}
            className="mt-3 text-xs text-brand-400 font-semibold flex items-center gap-1.5 transition-colors">
            <svg
              className="w-3.5 h-3.5 transition-transform duration-300"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Ocultar detalles' : `${meal.foods.length} ingrediente${meal.foods.length !== 1 ? 's' : ''}`}
          </button>
        )}

        {/* Smooth expand with max-height transition */}
        <div
          style={{
            maxHeight: expanded ? `${meal.foods.length * 64 + 32}px` : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="mt-3 space-y-0">
            {meal.foods.map((f, i) => (
              <div key={i} className="flex justify-between items-center py-2.5"
                style={{ borderBottom: i < meal.foods.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div>
                  <div className="font-medium text-zinc-200 text-sm">{f.name}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">{f.portion}</div>
                </div>
                <div className="text-sm font-bold text-zinc-400">{f.calories} kcal</div>
              </div>
            ))}
            {meal.notes && <p className="text-xs text-zinc-600 italic pt-1">{meal.notes}</p>}
          </div>
        </div>

        <button onClick={handleDelete} disabled={deleting}
          className="mt-3 text-xs text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-50">
          {deleting ? 'Eliminando…' : 'Eliminar comida'}
        </button>
      </div>
    </div>
  )
}
