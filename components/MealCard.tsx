'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Meal {
  id: string
  name: string | null
  photo_path: string | null
  foods: FoodItem[]
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_type: string
  notes: string | null
  created_at: number
}

interface Props {
  meal: Meal
  onDelete?: (id: string) => void
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function MealCard({ meal, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const time = new Date(meal.created_at * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  async function handleDelete() {
    if (!confirm('Delete this meal?')) return
    setDeleting(true)
    await fetch(`/api/meals/${meal.id}`, { method: 'DELETE' })
    onDelete?.(meal.id)
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in">
      {meal.photo_path && (
        <div className="relative w-full h-44">
          <Image
            src={meal.photo_path}
            alt={meal.name || 'Meal photo'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 500px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div>
              <span className="text-white font-bold text-lg leading-tight line-clamp-1">
                {meal.name || 'Meal'}
              </span>
              <div className="text-white/80 text-xs mt-0.5">{time}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-right">
              <div className="text-white font-bold text-lg leading-none">{Math.round(meal.calories)}</div>
              <div className="text-white/80 text-xs">kcal</div>
            </div>
          </div>
          <div className="absolute top-3 left-3">
            <span className="text-lg">{MEAL_ICONS[meal.meal_type] || '🍽️'}</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {!meal.photo_path && (
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span>{MEAL_ICONS[meal.meal_type] || '🍽️'}</span>
                <span className="font-semibold text-ink">{meal.name || 'Meal'}</span>
              </div>
              <div className="text-xs text-ink-tertiary mt-0.5">{time}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-ink">{Math.round(meal.calories)}</div>
              <div className="text-xs text-ink-secondary">kcal</div>
            </div>
          </div>
        )}

        <div className="flex gap-3 text-sm">
          {[
            { label: 'P', value: meal.protein, color: 'bg-indigo-100 text-indigo-700' },
            { label: 'C', value: meal.carbs, color: 'bg-amber-100 text-amber-700' },
            { label: 'F', value: meal.fat, color: 'bg-red-100 text-red-700' },
          ].map(m => (
            <span key={m.label} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${m.color}`}>
              {m.label} {Math.round(m.value)}g
            </span>
          ))}
        </div>

        {meal.foods.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-xs text-brand-600 font-semibold flex items-center gap-1"
          >
            {expanded ? '▲ Hide' : `▼ ${meal.foods.length} item${meal.foods.length !== 1 ? 's' : ''}`}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5 animate-fade-in">
            {meal.foods.map((f, i) => (
              <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-surface-tertiary last:border-0">
                <div>
                  <div className="font-medium text-ink">{f.name}</div>
                  <div className="text-xs text-ink-tertiary">{f.portion}</div>
                </div>
                <div className="text-sm font-semibold text-ink">{f.calories} kcal</div>
              </div>
            ))}
            {meal.notes && (
              <p className="text-xs text-ink-secondary italic mt-2">{meal.notes}</p>
            )}
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-3 text-xs text-ink-tertiary hover:text-red-500 transition-colors"
        >
          {deleting ? 'Deleting…' : 'Delete meal'}
        </button>
      </div>
    </div>
  )
}
