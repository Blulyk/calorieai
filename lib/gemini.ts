import { GoogleGenerativeAI } from '@google/generative-ai'

export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface AnalysisResult {
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fiber: number
  confidence: 'high' | 'medium' | 'low'
  meal_type_suggestion: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  notes: string
}

export interface CalorieGoalResult {
  tdee: number
  calorie_goal: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  bmi: number
  bmi_category: string
  estimated_weeks_to_goal: number | null
  advice: string
  tips: string[]
}

const FOOD_ANALYSIS_PROMPT = `You are a professional nutritionist AI. Analyze this food image and return a precise nutritional breakdown.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "foods": [
    {
      "name": "Food name in English",
      "portion": "estimated portion (e.g., '1 cup', '200g', '1 medium piece')",
      "calories": 300,
      "protein": 15,
      "carbs": 30,
      "fat": 10,
      "fiber": 3
    }
  ],
  "total_calories": 300,
  "total_protein": 15,
  "total_carbs": 30,
  "total_fat": 10,
  "total_fiber": 3,
  "confidence": "high",
  "meal_type_suggestion": "lunch",
  "notes": "Brief note about the meal"
}

Rules:
- List each distinct food item separately
- Use realistic portion estimates based on visual cues
- calories/protein/carbs/fat/fiber must be numbers (not strings)
- confidence: "high" if food is clearly identifiable, "medium" if partially visible, "low" if ambiguous
- meal_type_suggestion: "breakfast", "lunch", "dinner", or "snack"
- If no food is visible, return {"error": "No food detected in image"}`

export async function analyzeFood(apiKey: string, imageBase64: string, mimeType: string): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContent([
    FOOD_ANALYSIS_PROMPT,
    { inlineData: { data: imageBase64, mimeType } },
  ])

  const text = result.response.text().trim()
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: AnalysisResult & { error?: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Could not parse AI response. Please try again.')
  }

  if (parsed.error) throw new Error(parsed.error)
  return parsed
}

export async function calculateCalorieGoal(
  apiKey: string,
  data: {
    weight_kg: number
    height_cm: number
    age: number
    gender: string
    activity_level: string
    goal: string
    target_weight: number
  }
): Promise<CalorieGoalResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a certified nutritionist and fitness expert. Calculate precise calorie and macro goals.

User profile:
- Weight: ${data.weight_kg} kg
- Height: ${data.height_cm} cm
- Age: ${data.age} years
- Gender: ${data.gender}
- Activity level: ${data.activity_level} (sedentary=desk job no exercise, light=1-3 days/week, moderate=3-5 days/week, active=6-7 days/week, very_active=athlete/physical job)
- Goal: ${data.goal} weight (lose/maintain/gain)
- Target weight: ${data.target_weight} kg

Use Mifflin-St Jeor equation for BMR, apply activity multiplier, then adjust for goal.
Activity multipliers: sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very_active=1.9
Goal adjustments: lose=-500 kcal/day, maintain=0, gain=+300 kcal/day

Return ONLY valid JSON (no markdown):
{
  "tdee": 2200,
  "calorie_goal": 1700,
  "protein_goal": 130,
  "carbs_goal": 170,
  "fat_goal": 60,
  "bmi": 24.5,
  "bmi_category": "Normal weight",
  "estimated_weeks_to_goal": 20,
  "advice": "Personalized 2-3 sentence advice",
  "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Could not calculate calorie goal. Please try again.')
  }
}

export async function analyzeRecipe(
  name: string,
  ingredients: string[],
  servings: number,
  apiKey: string
): Promise<{ foods: Array<{ name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }>; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; total_fiber: number; notes: string }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `Analyze this recipe nutritionally. Recipe name: "${name}". Servings: ${servings}. Ingredients: ${ingredients.join(', ')}.
Return ONLY valid JSON (no markdown):
{"foods":[{"name":"ingredient name","portion":"amount","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"total_calories":0,"total_protein":0,"total_carbs":0,"total_fat":0,"total_fiber":0,"notes":"brief note"}
All values are per serving (total divided by ${servings} servings). Be accurate with realistic nutritional values.`
  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(text)
}
