'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type CategoryId = 'nigiri' | 'maki' | 'tempura' | 'gyoza' | 'postre' | 'otros'

export interface BuffetBreakdown extends Record<CategoryId, number> {
  nigiri: number
  maki: number
  tempura: number
  gyoza: number
  postre: number
  otros: number
}

export interface BuffetSession {
  startTime: number          // Date.now() when session started
  totalPieces: number
  breakdown: BuffetBreakdown
  emojiIdx: number
}

export interface BuffetResult {
  id: string
  total_pieces: number
  is_record: boolean
  is_first_session: boolean
  previous_record: number
  calories: number
  protein: number
  carbs: number
  fat: number
  summary: string
}

interface BuffetContextValue {
  session: BuffetSession | null
  fullscreen: boolean
  finishedResult: BuffetResult | null
  startSession: () => void
  endSession: () => void
  addPiece: () => void
  adjustCategory: (id: CategoryId, delta: number) => void
  nextEmoji: () => void
  setFullscreen: (v: boolean) => void
  setFinishedResult: (r: BuffetResult | null) => void
  clearFinishedResult: () => void
}

const EMOJI_COUNT = 12

const BuffetContext = createContext<BuffetContextValue | null>(null)

export function BuffetProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BuffetSession | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [finishedResult, setFinishedResult] = useState<BuffetResult | null>(null)

  const startSession = useCallback(() => {
    setSession({
      startTime: Date.now(),
      totalPieces: 0,
      breakdown: { nigiri: 0, maki: 0, tempura: 0, gyoza: 0, postre: 0, otros: 0 },
      emojiIdx: 0,
    })
    setFullscreen(true)
  }, [])

  const endSession = useCallback(() => {
    setSession(null)
    setFullscreen(false)
  }, [])

  const addPiece = useCallback(() => {
    setSession(s => s ? {
      ...s,
      totalPieces: s.totalPieces + 1,
      emojiIdx: (s.emojiIdx + 1) % EMOJI_COUNT,
    } : s)
  }, [])

  const adjustCategory = useCallback((id: CategoryId, delta: number) => {
    setSession(s => s ? {
      ...s,
      breakdown: { ...s.breakdown, [id]: Math.max(0, s.breakdown[id] + delta) },
    } : s)
  }, [])

  const nextEmoji = useCallback(() => {
    setSession(s => s ? { ...s, emojiIdx: (s.emojiIdx + 1) % EMOJI_COUNT } : s)
  }, [])

  const clearFinishedResult = useCallback(() => setFinishedResult(null), [])

  return (
    <BuffetContext.Provider value={{
      session, fullscreen, finishedResult,
      startSession, endSession, addPiece, adjustCategory, nextEmoji,
      setFullscreen, setFinishedResult, clearFinishedResult,
    }}>
      {children}
    </BuffetContext.Provider>
  )
}

export function useBuffet() {
  const ctx = useContext(BuffetContext)
  if (!ctx) throw new Error('useBuffet must be used inside BuffetProvider')
  return ctx
}
