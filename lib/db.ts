// Uses Node.js built-in sqlite (Node 22.5+, stable in Node 24)
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const DB_DIR = process.env.DB_PATH || path.join(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'calorieai.db')

let _db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (_db) return _db
  fs.mkdirSync(DB_DIR, { recursive: true })
  _db = new DatabaseSync(DB_FILE)
  _db.exec('PRAGMA journal_mode = WAL')
  _db.exec('PRAGMA foreign_keys = ON')
  initSchema(_db)
  return _db
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gemini_api_key  TEXT,
      height_cm       REAL,
      weight_kg       REAL,
      target_weight   REAL,
      age             INTEGER,
      gender          TEXT,
      activity_level  TEXT DEFAULT 'moderate',
      goal            TEXT DEFAULT 'maintain',
      calorie_goal    INTEGER,
      updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS meals (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date          TEXT NOT NULL,
      photo_path    TEXT,
      name          TEXT,
      foods         TEXT NOT NULL DEFAULT '[]',
      calories      REAL NOT NULL DEFAULT 0,
      protein       REAL NOT NULL DEFAULT 0,
      carbs         REAL NOT NULL DEFAULT 0,
      fat           REAL NOT NULL DEFAULT 0,
      fiber         REAL NOT NULL DEFAULT 0,
      meal_type     TEXT DEFAULT 'snack',
      notes         TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

    CREATE TABLE IF NOT EXISTS daily_water (
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date      TEXT NOT NULL,
      glasses   INTEGER NOT NULL DEFAULT 0,
      water_ml  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      description  TEXT,
      ingredients  TEXT NOT NULL DEFAULT '[]',
      instructions TEXT,
      foods        TEXT NOT NULL DEFAULT '[]',
      calories     REAL NOT NULL DEFAULT 0,
      protein      REAL NOT NULL DEFAULT 0,
      carbs        REAL NOT NULL DEFAULT 0,
      fat          REAL NOT NULL DEFAULT 0,
      fiber        REAL NOT NULL DEFAULT 0,
      servings     INTEGER NOT NULL DEFAULT 1,
      photo_path   TEXT,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
  `)

  try {
    db.exec('ALTER TABLE daily_water ADD COLUMN water_ml INTEGER NOT NULL DEFAULT 0')
  } catch {
    // Existing installs already have this column.
  }

  db.exec('UPDATE daily_water SET water_ml = glasses * 250 WHERE water_ml = 0 AND glasses > 0')
}

// ─── User queries ─────────────────────────────────────────────────────────────

export function countUsers(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  return row.count
}

export function createUser(id: string, username: string, email: string, password: string) {
  const db = getDb()
  db.prepare('INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)').run(id, username, email, password)
  db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id)
}

export function getUserByEmail(email: string) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
}

export function getUserByUsername(username: string) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
}

export function getUserById(id: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined
}

// ─── Settings queries ──────────────────────────────────────────────────────────

export function getSettings(userId: string) {
  return getDb().prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as UserSettings | undefined
}

export function updateSettings(userId: string, data: Partial<UserSettings>) {
  const db = getDb()
  const allowed = ['gemini_api_key','height_cm','weight_kg','target_weight','age','gender','activity_level','goal','calorie_goal']
  const fields = Object.keys(data).filter(k => allowed.includes(k))
  if (!fields.length) return
  const set = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => (data as Record<string, unknown>)[f])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.prepare(`UPDATE user_settings SET ${set}, updated_at = unixepoch() WHERE user_id = ?`).run(...(vals as any[]), userId)
}

// ─── Meal queries ──────────────────────────────────────────────────────────────

export function getMealsByDate(userId: string, date: string) {
  return getDb().prepare(
    'SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC'
  ).all(userId, date) as unknown as Meal[]
}

export function getMealById(id: string, userId: string) {
  return getDb().prepare('SELECT * FROM meals WHERE id = ? AND user_id = ?').get(id, userId) as Meal | undefined
}

export function createMeal(meal: Omit<Meal, 'created_at'>) {
  getDb().prepare(`
    INSERT INTO meals (id, user_id, date, photo_path, name, foods, calories, protein, carbs, fat, fiber, meal_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    meal.id, meal.user_id, meal.date, meal.photo_path ?? null,
    meal.name ?? null, meal.foods, meal.calories, meal.protein,
    meal.carbs, meal.fat, meal.fiber, meal.meal_type, meal.notes ?? null
  )
}

export function deleteMeal(id: string, userId: string) {
  getDb().prepare('DELETE FROM meals WHERE id = ? AND user_id = ?').run(id, userId)
}

export function getDailyStats(userId: string, date: string) {
  return getDb().prepare(`
    SELECT
      COALESCE(SUM(calories),0) as calories,
      COALESCE(SUM(protein),0)  as protein,
      COALESCE(SUM(carbs),0)    as carbs,
      COALESCE(SUM(fat),0)      as fat,
      COALESCE(SUM(fiber),0)    as fiber
    FROM meals WHERE user_id = ? AND date = ?
  `).get(userId, date) as unknown as DailyStats
}

export function getWeeklyStats(userId: string, startDate: string, endDate: string) {
  return getDb().prepare(`
    WITH dates AS (
      SELECT date FROM meals WHERE user_id = ? AND date BETWEEN ? AND ?
      UNION
      SELECT date FROM daily_water WHERE user_id = ? AND date BETWEEN ? AND ?
    ),
    meal_stats AS (
      SELECT date,
        COALESCE(SUM(calories),0) as calories,
        COUNT(*) as meal_count
      FROM meals WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
    ),
    water_stats AS (
      SELECT date,
        COALESCE(water_ml, glasses * 250, 0) as water_ml,
        COALESCE(glasses, 0) as water_glasses
      FROM daily_water WHERE user_id = ? AND date BETWEEN ? AND ?
    )
    SELECT dates.date,
      COALESCE(meal_stats.calories,0) as calories,
      COALESCE(meal_stats.meal_count,0) as meal_count,
      COALESCE(water_stats.water_ml,0) as water_ml,
      COALESCE(water_stats.water_glasses,0) as water_glasses
    FROM dates
    LEFT JOIN meal_stats ON meal_stats.date = dates.date
    LEFT JOIN water_stats ON water_stats.date = dates.date
    ORDER BY dates.date
  `).all(
    userId, startDate, endDate,
    userId, startDate, endDate,
    userId, startDate, endDate,
    userId, startDate, endDate
  ) as unknown as DayStats[]
}

export function getMonthMealDates(userId: string, yearMonth: string) {
  return getDb().prepare(`
    SELECT date FROM (
      SELECT date FROM meals WHERE user_id = ? AND date LIKE ?
      UNION
      SELECT date FROM daily_water WHERE user_id = ? AND date LIKE ?
    ) ORDER BY date
  `).all(userId, `${yearMonth}%`, userId, `${yearMonth}%`) as unknown as { date: string }[]
}

// ─── Water queries ─────────────────────────────────────────────────────────────

export function getWater(userId: string, date: string): number {
  const row = getDb().prepare('SELECT glasses, water_ml FROM daily_water WHERE user_id = ? AND date = ?').get(userId, date) as { glasses: number; water_ml: number } | undefined
  if (!row) return 0
  return row.glasses || Math.round((row.water_ml || 0) / 250)
}

export function getWaterMl(userId: string, date: string): number {
  const row = getDb().prepare('SELECT glasses, water_ml FROM daily_water WHERE user_id = ? AND date = ?').get(userId, date) as { glasses: number; water_ml: number } | undefined
  if (!row) return 0
  return row.water_ml || (row.glasses || 0) * 250
}

export function setWater(userId: string, date: string, glasses: number) {
  const safeGlasses = Math.max(0, Math.trunc(glasses))
  const waterMl = safeGlasses * 250
  getDb().prepare(`
    INSERT INTO daily_water (user_id, date, glasses, water_ml) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      glasses = excluded.glasses,
      water_ml = excluded.water_ml
  `).run(userId, date, safeGlasses, waterMl)
}

export function setWaterMl(userId: string, date: string, waterMl: number) {
  const safeWaterMl = Math.max(0, Math.trunc(waterMl))
  const glasses = Math.round(safeWaterMl / 250)
  getDb().prepare(`
    INSERT INTO daily_water (user_id, date, glasses, water_ml) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      glasses = excluded.glasses,
      water_ml = excluded.water_ml
  `).run(userId, date, glasses, safeWaterMl)
}

// ─── Recipe queries ────────────────────────────────────────────────────────────

export function getRecipes(userId: string) {
  return getDb().prepare('SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC').all(userId) as unknown as Recipe[]
}
export function getRecipeById(id: string, userId: string) {
  return getDb().prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?').get(id, userId) as Recipe | undefined
}
export function createRecipe(recipe: Omit<Recipe, 'created_at' | 'updated_at'>) {
  getDb().prepare(`
    INSERT INTO recipes (id, user_id, name, description, ingredients, instructions, foods, calories, protein, carbs, fat, fiber, servings, photo_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(recipe.id, recipe.user_id, recipe.name, recipe.description ?? null, recipe.ingredients, recipe.instructions ?? null, recipe.foods, recipe.calories, recipe.protein, recipe.carbs, recipe.fat, recipe.fiber, recipe.servings, recipe.photo_path ?? null)
}
export function updateRecipePhoto(id: string, userId: string, photoPath: string) {
  getDb().prepare('UPDATE recipes SET photo_path = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?').run(photoPath, id, userId)
}
export function deleteRecipe(id: string, userId: string) {
  getDb().prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').run(id, userId)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string
  email: string
  password: string
  created_at: number
}

export interface UserSettings {
  user_id: string
  gemini_api_key: string | null
  height_cm: number | null
  weight_kg: number | null
  target_weight: number | null
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
  calorie_goal: number | null
  updated_at: number
}

export interface Meal {
  id: string
  user_id: string
  date: string
  photo_path: string | null
  name: string | null
  foods: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  notes: string | null
  created_at: number
}

export interface DailyStats {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface DayStats {
  date: string
  calories: number
  meal_count: number
  water_ml: number
  water_glasses: number
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  description: string | null
  ingredients: string  // JSON array of strings
  instructions: string | null
  foods: string  // JSON array of FoodItem
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  servings: number
  photo_path: string | null
  created_at: number
  updated_at: number
}
