import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, updateSettings } from '@/lib/db'
import type { CalorieGoalResult } from '@/lib/gemini'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = getSettings(session.userId)
    if (!settings) {
      return NextResponse.json({ error: 'No se encontro tu perfil' }, { status: 404 })
    }
    if (!settings.weight_kg || !settings.height_cm || !settings.age || !settings.gender) {
      return NextResponse.json({ error: 'Completa primero peso, altura, edad y sexo' }, { status: 400 })
    }

    const result = calculateCalorieGoalLocally({
      weight_kg: settings.weight_kg,
      height_cm: settings.height_cm,
      age: settings.age,
      gender: settings.gender,
      activity_level: settings.activity_level,
      goal: settings.goal,
      target_weight: settings.target_weight ?? settings.weight_kg,
    })

    updateSettings(session.userId, { calorie_goal: result.calorie_goal, goal_summary: JSON.stringify(result) })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function calculateCalorieGoalLocally(data: {
  weight_kg: number
  height_cm: number
  age: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
  target_weight: number
}): CalorieGoalResult {
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  const goalAdjustments = {
    lose: -500,
    maintain: 0,
    gain: 300,
  }

  const bmr = data.gender === 'male'
    ? (10 * data.weight_kg) + (6.25 * data.height_cm) - (5 * data.age) + 5
    : (10 * data.weight_kg) + (6.25 * data.height_cm) - (5 * data.age) - 161
  const tdee = Math.round(bmr * activityMultipliers[data.activity_level])
  const calorieGoal = Math.max(1200, Math.round(tdee + goalAdjustments[data.goal]))
  const proteinGoal = Math.round(data.weight_kg * (data.goal === 'gain' ? 2.0 : 1.8))
  const fatGoal = Math.round((calorieGoal * 0.25) / 9)
  const carbsGoal = Math.max(0, Math.round((calorieGoal - (proteinGoal * 4) - (fatGoal * 9)) / 4))
  const bmi = Number((data.weight_kg / ((data.height_cm / 100) ** 2)).toFixed(1))
  const weightDelta = Math.abs(data.weight_kg - data.target_weight)
  const estimatedWeeksToGoal = data.goal === 'maintain' || weightDelta < 0.2
    ? null
    : Math.max(1, Math.ceil(weightDelta / (data.goal === 'gain' ? 0.25 : 0.5)))

  return {
    tdee,
    calorie_goal: calorieGoal,
    protein_goal: proteinGoal,
    carbs_goal: carbsGoal,
    fat_goal: fatGoal,
    bmi,
    bmi_category: getBmiCategory(bmi),
    estimated_weeks_to_goal: estimatedWeeksToGoal,
    advice: buildAdvice(data.goal, calorieGoal, tdee),
    tips: [
      'Prioriza proteina en cada comida para proteger masa muscular y mejorar saciedad.',
      'Mantén una media semanal estable; un dia aislado no define el progreso.',
      'Ajusta el objetivo si tu peso real no cambia tras dos o tres semanas.',
      'Combina fuerza, pasos diarios y descanso suficiente para que el plan sea sostenible.',
    ],
  }
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return 'Peso bajo'
  if (bmi < 25) return 'Peso normal'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidad'
}

function buildAdvice(goal: 'lose' | 'maintain' | 'gain', calorieGoal: number, tdee: number) {
  if (goal === 'lose') {
    return `Tu objetivo recomendado es ${calorieGoal} kcal/dia, con un deficit moderado frente a tu mantenimiento estimado de ${tdee} kcal. Busca constancia y evita recortes agresivos para que el progreso sea sostenible.`
  }
  if (goal === 'gain') {
    return `Tu objetivo recomendado es ${calorieGoal} kcal/dia, con un superavit controlado frente a tu mantenimiento estimado de ${tdee} kcal. Prioriza entrenamiento de fuerza y subidas graduales de peso.`
  }
  return `Tu objetivo recomendado es ${calorieGoal} kcal/dia, muy cerca de tu mantenimiento estimado. Usa este valor como punto de partida y ajusta segun tu peso medio semanal.`
}
