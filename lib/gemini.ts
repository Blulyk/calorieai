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
  model_used?: string
  fallback_used?: boolean
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

export class GeminiApiError extends Error {
  code: number
  retryAfterSeconds: number | null
  retryable: boolean

  constructor(message: string, code: number, retryAfterSeconds: number | null = null, retryable = false) {
    super(message)
    this.name = 'GeminiApiError'
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
    this.retryable = retryable
  }
}

function parseRetryDelaySeconds(message: string): number | null {
  const retryInfo = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i)
  if (retryInfo) return Math.ceil(Number(retryInfo[1]))

  const retryAfter = message.match(/retry(?:\s|-)?after[^\d]*(\d+)\s*(s|sec|second|seconds|min|minute|minutes)?/i)
  if (!retryAfter) return null

  const amount = Number(retryAfter[1])
  if (!Number.isFinite(amount)) return null
  const unit = retryAfter[2]?.toLowerCase() || 'seconds'
  return unit.startsWith('min') ? amount * 60 : amount
}

function extractGeminiCode(message: string): number {
  const explicit = message.match(/\[(\d{3})\s+[^\]]+\]/)
  if (explicit) return Number(explicit[1])

  const status = message.match(/\b(429|503|500|502|504|400|401|403)\b/)
  return status ? Number(status[1]) : 422
}

function humanizeGeminiError(err: unknown): GeminiApiError {
  const raw = err instanceof Error ? err.message : String(err)
  const code = extractGeminiCode(raw)
  const retryAfterSeconds = parseRetryDelaySeconds(raw)

  if (code === 503) {
    return new GeminiApiError(
      '503: Mucha demanda en Gemini. Reintentando automaticamente.',
      503,
      retryAfterSeconds,
      true
    )
  }

  if (code === 429) {
    const wait = retryAfterSeconds
      ? ` Vuelve a intentarlo en ${formatRetryDelay(retryAfterSeconds)}.`
      : ' Vuelve a intentarlo cuando Google restablezca tu cuota.'
    return new GeminiApiError(`429: Has alcanzado el limite de uso.${wait}`, 429, retryAfterSeconds, false)
  }

  return new GeminiApiError(`${code}: No se pudo completar el analisis. Intentalo de nuevo.`, code, retryAfterSeconds, false)
}

const FOOD_ANALYSIS_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

export function formatRetryDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} segundo${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`
}

const FOOD_ANALYSIS_PROMPT = `You are a professional dietitian and food scientist with 20 years of experience estimating nutritional content from images. Your calorie estimates are known for their accuracy and are used in medical-grade apps.

Analyze this food image and return a PRECISE nutritional breakdown. Think step-by-step:
1. Identify each food item and its preparation method (fried, boiled, baked, raw, sauced, etc.)
2. Estimate the weight/volume using visual reference points (plate size, fork, hand, container)
3. Apply the correct nutritional values for that specific preparation

CRITICAL ACCURACY RULES:
- A standard restaurant plate is ~26cm diameter; use this to calibrate portions
- Sauces, dressings and oils ADD significant calories (1 tbsp oil = 120 kcal)
- Fried foods have 30-50% more calories than their raw weight suggests
- Cheese adds ~100 kcal per 30g slice; sauces add ~50-150 kcal per serving
- Pasta/rice portions: a typical serving is 200-300g cooked (not the dry weight)
- Bread: a standard slice = 70-80 kcal; burger bun = 130-150 kcal
- Never underestimate: people tend to eat standard to large portions in real life
- If you see a full plate of food it's typically 400-900 kcal, rarely less

REFERENCE CALORIES (use these as anchors):
- Big Mac: 550 kcal | Slice of pizza: 280 kcal | Bowl of pasta: 500-700 kcal
- Grilled chicken breast 150g: 230 kcal | Salmon fillet 150g: 310 kcal
- White rice 200g cooked: 260 kcal | Salad with dressing: 200-400 kcal
- Avocado toast (2 slices): 380 kcal | Scrambled eggs 2: 200 kcal

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "foods": [
    {
      "name": "Specific food name with preparation (e.g. 'Grilled salmon fillet', 'Fried chicken thigh')",
      "portion": "estimated weight or count (e.g. '180g', '2 pieces', '1 cup cooked')",
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
  "notes": "Brief note mentioning key assumptions about portions or cooking method"
}

Rules:
- List EVERY distinct food item and condiment separately
- Be specific: not "chicken" but "fried chicken thigh with skin"
- calories/protein/carbs/fat/fiber must be numbers (never strings or null)
- confidence: "high" if food clearly identifiable and portion estimable, "medium" if partially visible or unusual, "low" if very ambiguous
- meal_type_suggestion: "breakfast", "lunch", "dinner", or "snack"
- If absolutely no food is visible, return {"error": "No food detected in image"}
- Do NOT return 0 calories for real food items — estimate even if uncertain`

export async function analyzeFood(apiKey: string, imageBase64: string, mimeType: string): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const errors: GeminiApiError[] = []
  let lowConfidenceFallback: AnalysisResult | null = null

  for (const modelName of FOOD_ANALYSIS_MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName })

    let result
    try {
      result = await model.generateContent([
        FOOD_ANALYSIS_PROMPT,
        { inlineData: { data: imageBase64, mimeType } },
      ])
    } catch (err) {
      const geminiError = humanizeGeminiError(err)
      errors.push(geminiError)
      if (geminiError.code === 429 || geminiError.retryable) continue
      throw geminiError
    }

    const text = result.response.text().trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed: AnalysisResult & { error?: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      errors.push(new GeminiApiError(`${modelName}: respuesta invalida del modelo. Probando otro modelo.`, 422, null, false))
      continue
    }

    if (parsed.error) throw new GeminiApiError(`422: ${parsed.error}`, 422, null, false)

    const analysis = {
      ...parsed,
      model_used: modelName,
      fallback_used: modelName !== FOOD_ANALYSIS_MODELS[0],
    }

    if (parsed.confidence === 'low' && modelName === 'gemini-2.5-flash-lite') {
      lowConfidenceFallback = analysis
      errors.push(new GeminiApiError(`${modelName}: confianza baja. Probando un modelo mas preciso.`, 422, null, false))
      continue
    }

    return analysis
  }

  if (lowConfidenceFallback) return lowConfidenceFallback

  const quotaError = errors.find(e => e.code === 429)
  if (quotaError) throw quotaError

  const overloadError = errors.find(e => e.code === 503)
  if (overloadError) throw overloadError

  throw errors[0] ?? new GeminiApiError('422: No se pudo completar el analisis. Intentalo de nuevo.', 422, null, false)
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

export async function suggestRecipeEmoji(name: string, ingredients: string[], apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const prompt = `Reply with exactly ONE emoji that best represents this recipe: "${name}" (ingredients: ${ingredients.slice(0, 5).join(', ')}). Reply with only the single emoji character, no text, no punctuation.`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    // Extract first emoji from response
    const emojiMatch = text.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u)
    return emojiMatch ? emojiMatch[0] : '🍽️'
  } catch {
    return '🍽️'
  }
}

export async function analyzeRecipe(
  name: string,
  ingredients: string[],
  servings: number,
  apiKey: string,
  description = '',
  instructions = ''
): Promise<{ foods: Array<{ name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }>; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; total_fiber: number; notes: string }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `Analyze this recipe nutritionally. Recipe name: "${name}". Description: "${description || 'Not provided'}". Servings: ${servings}. Ingredients: ${ingredients.join(', ')}. Instructions or preparation notes: "${instructions || 'Not provided'}".
Return ONLY valid JSON (no markdown):
{"foods":[{"name":"ingredient name","portion":"amount","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}],"total_calories":0,"total_protein":0,"total_carbs":0,"total_fat":0,"total_fiber":0,"notes":"brief note"}
All values are per serving (total divided by ${servings} servings). Be accurate with realistic nutritional values.`
  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(text)
}
