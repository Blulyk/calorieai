import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, updateSettings } from '@/lib/db'
import { calculateCalorieGoal } from '@/lib/gemini'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = getSettings(session.userId)
    if (!settings?.gemini_api_key) {
      return NextResponse.json({ error: 'Add your Gemini API key first' }, { status: 400 })
    }
    if (!settings.weight_kg || !settings.height_cm || !settings.age || !settings.gender) {
      return NextResponse.json({ error: 'Complete your profile first (weight, height, age, gender)' }, { status: 400 })
    }

    const result = await calculateCalorieGoal(settings.gemini_api_key, {
      weight_kg: settings.weight_kg,
      height_cm: settings.height_cm,
      age: settings.age,
      gender: settings.gender,
      activity_level: settings.activity_level,
      goal: settings.goal,
      target_weight: settings.target_weight ?? settings.weight_kg,
    })

    updateSettings(session.userId, { calorie_goal: result.calorie_goal })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
