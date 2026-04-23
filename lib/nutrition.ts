export function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  }
  return 10 * weight + 6.25 * height - 5 * age - 161
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateTDEE(bmr: number, activity: string): number {
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity] ?? 1.55))
}

export function calculateGoalCalories(tdee: number, goal: string): number {
  if (goal === 'lose') return Math.max(1200, tdee - 500)
  if (goal === 'gain') return tdee + 300
  return tdee
}

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal weight'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function calorieProgress(consumed: number, goal: number) {
  const remaining = goal - consumed
  const pct = Math.min(100, Math.round((consumed / goal) * 100))
  return { remaining, pct, over: consumed > goal }
}
