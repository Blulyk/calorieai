'use client'

import { useState, useEffect, useRef } from 'react'
import { useBuffet, type CategoryId } from '@/lib/buffetContext'

const EMOJIS = ['🍣', '🦐', '🐟', '🌀', '🍱', '🥢', '🍤', '🫙', '🍙', '🎏', '🦑', '🐙']

const CATEGORIES = [
  { id: 'nigiri',  label: 'Nigiri',  emoji: '🍣' },
  { id: 'maki',    label: 'Maki',    emoji: '🌀' },
  { id: 'tempura', label: 'Tempura', emoji: '🍤' },
  { id: 'gyoza',   label: 'Gyoza',   emoji: '🥟' },
  { id: 'postre',  label: 'Postre',  emoji: '🍡' },
  { id: 'otros',   label: 'Otros',   emoji: '🍱' },
] as const

interface GeminiAttempt { model: string; ok: boolean; status: number | string; detail: string }

function summarizeAttempts(attempts: GeminiAttempt[]): string {
  if (!attempts.length) return 'No se pudo contactar con Gemini'
  if (attempts.some(a => a.status === 401)) return 'API key no autorizada'
  if (attempts.some(a => a.status === 403)) return 'API key sin permisos de acceso'
  if (attempts.every(a => a.status === 429)) return `Cuota agotada · ${attempts.length} modelo${attempts.length > 1 ? 's' : ''} probado${attempts.length > 1 ? 's' : ''}`
  if (attempts.every(a => a.status === 'network_error')) return 'Sin respuesta de los servidores de Google'
  const n = attempts.length
  return `${n} modelo${n > 1 ? 's' : ''} probado${n > 1 ? 's' : ''} · ninguno respondió correctamente`
}

function shortStatus(a: GeminiAttempt): string {
  if (a.ok) return 'OK'
  if (a.status === 'network_error') return 'Sin red / Timeout'
  if (a.status === 'parse_error') return 'Respuesta vacía'
  if (a.status === 'bad_json') return 'JSON inválido'
  if (a.status === 'sanity_failed') return 'Valores anómalos'
  if (typeof a.status === 'number') return `HTTP ${a.status}`
  return 'Error'
}

interface AnalysisPreview {
  calories: number; protein: number; carbs: number; fat: number
  summary: string; gemini_used: boolean
}

export default function BuffetSession() {
  const {
    session, fullscreen, finishedResult,
    addPiece, adjustCategory, setFullscreen, endSession,
    setFinishedResult,
  } = useBuffet()

  const [pressed, setPressed]         = useState(false)
  const [ripples, setRipples]         = useState<{ id: number; x: number; y: number }[]>([])
  const [elapsed, setElapsed]         = useState(0)
  const [analyzing, setAnalyzing]     = useState(false)
  const [analyzingMode, setAnalyzingMode] = useState<'gemini' | 'local' | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [showDiag, setShowDiag]       = useState(false)
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreview | null>(null)
  const [geminiFailState, setGeminiFailState] = useState<{
    local_estimate: { calories: number; protein: number; carbs: number; fat: number; summary: string }
    attempts: GeminiAttempt[]
  } | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId  = useRef(0)

  // Live timer driven by session.startTime (survives navigation)
  useEffect(() => {
    if (!session) return
    const update = () => setElapsed(Math.floor((Date.now() - session.startTime) / 1000))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [session])

  if (!session || !fullscreen) return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  function triggerSpring() {
    const btn = buttonRef.current
    if (!btn) return
    btn.style.animation = 'none'
    void btn.offsetWidth
    btn.style.animation = 'sushiSpring 0.4s cubic-bezier(.36,.07,.19,.97) forwards'
    setTimeout(() => { if (buttonRef.current) buttonRef.current.style.animation = '' }, 420)
  }

  function handleTap(e: React.PointerEvent<HTMLButtonElement>) {
    if (analyzing) return
    addPiece()
    triggerSpring()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId.current
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700)
  }

  // ── Analyze: call API in analyze mode, no save ────────────────────────────
  async function analyzeBuffet(force_local = false) {
    if (!session) return
    setAnalyzing(true)
    setAnalyzingMode(force_local ? 'local' : 'gemini')
    setError('')
    setShowDiag(false)
    const duration_minutes = Math.max(1, Math.round(elapsed / 60))
    try {
      const res = await fetch('/api/buffet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_pieces: session.totalPieces,
          breakdown: session.breakdown,
          duration_minutes,
          mode: 'analyze',
          force_local,
        }),
      })
      const data = await res.json()

      if (res.status === 503 && data.gemini_failed) {
        setGeminiFailState({ local_estimate: data.local_estimate, attempts: data.attempts ?? [] })
        setAnalysisPreview(null)
        setAnalyzing(false)
        setAnalyzingMode(null)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Error al analizar')
        setAnalyzing(false)
        setAnalyzingMode(null)
        return
      }

      setAnalysisPreview({
        calories: data.calories, protein: data.protein,
        carbs: data.carbs, fat: data.fat,
        summary: data.summary ?? '',
        gemini_used: data.gemini_used ?? false,
      })
      setGeminiFailState(null)
    } catch {
      setError('Error de conexión')
    }
    setAnalyzing(false)
    setAnalyzingMode(null)
  }

  // ── Save: persist the current analysisPreview ─────────────────────────────
  async function saveBuffet() {
    if (!session || !analysisPreview) return
    setSaving(true)
    setError('')
    const duration_minutes = Math.max(1, Math.round(elapsed / 60))
    try {
      const res = await fetch('/api/buffet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_pieces: session.totalPieces,
          breakdown: session.breakdown,
          duration_minutes,
          mode: 'save',
          nutrition: {
            calories: analysisPreview.calories, protein: analysisPreview.protein,
            carbs: analysisPreview.carbs, fat: analysisPreview.fat,
            summary: analysisPreview.summary,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar'); setSaving(false); return }
      setAnalysisPreview(null)
      setFinishedResult(data)
    } catch {
      setError('Error de conexión')
    }
    setSaving(false)
  }

  function handleClose() { setFullscreen(false) }

  const totalPieces = session.totalPieces
  const breakdown   = session.breakdown
  const emojiIdx    = session.emojiIdx

  // ── Shared styles ─────────────────────────────────────────────────────────
  const baseScreen: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'linear-gradient(180deg, #080004 0%, #0d0008 60%, #100004 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '52px 20px 36px', overflowY: 'auto',
  }
  const spinner = (color = '#fff', size = 16) => (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}33`, borderTopColor: color,
      animation: 'spinLoader 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
    }} />
  )

  // ── Gemini fail screen ────────────────────────────────────────────────────
  if (geminiFailState) {
    const { local_estimate, attempts } = geminiFailState
    const summary = summarizeAttempts(attempts)
    const busy = analyzing

    return (
      <div style={baseScreen}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>⚠️</div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                Gemini no disponible
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,159,10,0.8)', margin: '3px 0 0', lineHeight: 1.4 }}>
                {summary}
              </p>
            </div>
          </div>

          {/* Collapsible diagnostics */}
          {attempts.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => setShowDiag(d => !d)} style={{
                background: 'none', border: 'none', padding: '4px 0',
                fontSize: 11, color: 'rgba(255,255,255,0.28)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ display: 'inline-block', fontSize: 8, transform: showDiag ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>▶</span>
                Ver diagnóstico
              </button>
              {showDiag && (
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', marginTop: 6 }}>
                  {attempts.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      paddingBottom: i < attempts.length - 1 ? 7 : 0,
                      marginBottom: i < attempts.length - 1 ? 7 : 0,
                      borderBottom: i < attempts.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: a.ok ? '#32D74B' : '#FF453A' }} />
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.model}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{shortStatus(a)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local estimate preview */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 18px', marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 10, textAlign: 'center' }}>
              Estimación local · {totalPieces} piezas
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[
                { l: 'Calorías', v: local_estimate.calories, u: 'kcal', c: '#FF9F0A' },
                { l: 'Proteína', v: local_estimate.protein,  u: 'g',    c: '#32D74B' },
                { l: 'Carbos',   v: local_estimate.carbs,    u: 'g',    c: '#5AC8FA' },
                { l: 'Grasa',    v: local_estimate.fat,      u: 'g',    c: '#FFD60A' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.c, fontVariantNumeric: 'tabular-nums' }}>
                    {m.v}<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>{m.u}</span>
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => analyzeBuffet(false)} disabled={busy} style={{
            width: '100%', height: 52, borderRadius: 16, marginBottom: 10,
            background: busy && analyzingMode === 'gemini' ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #dc143c 0%, #7a0015 100%)',
            border: busy ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(220,20,60,0.5)',
            color: busy && analyzingMode === 'gemini' ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: !busy ? '0 4px 20px rgba(220,20,60,0.3)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.25s', touchAction: 'manipulation',
          }}>
            {busy && analyzingMode === 'gemini' ? <>{spinner()}Reintentando con Gemini…</> : '🔄 Reintentar con Gemini'}
          </button>

          <button onClick={() => analyzeBuffet(true)} disabled={busy} style={{
            width: '100%', height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
            color: busy ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
            fontSize: 15, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.25s', touchAction: 'manipulation',
          }}>
            {busy && analyzingMode === 'local' ? <>{spinner('rgba(255,255,255,0.6)')}Calculando…</> : '📊 Usar estimación local'}
          </button>

          {error && <p style={{ marginTop: 14, fontSize: 12, color: '#ff8080', textAlign: 'center' }}>{error}</p>}
        </div>
        <style>{`@keyframes spinLoader { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Analysis preview / review screen ─────────────────────────────────────
  if (analysisPreview) {
    const busy = analyzing || saving
    const accentColor = analysisPreview.gemini_used ? 'rgba(125,122,255,0.8)' : 'rgba(88,190,248,0.75)'
    const accentBg    = analysisPreview.gemini_used ? 'rgba(125,122,255,0.12)' : 'rgba(88,190,248,0.1)'
    const accentBorder = analysisPreview.gemini_used ? 'rgba(125,122,255,0.3)' : 'rgba(88,190,248,0.25)'

    return (
      <div style={baseScreen}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: accentBg, border: `1px solid ${accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>
              {analysisPreview.gemini_used ? '🤖' : '📊'}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {analysisPreview.gemini_used ? 'Análisis de Gemini' : 'Estimación local'}
              </h2>
              <p style={{ fontSize: 11, color: accentColor, margin: '2px 0 0' }}>
                {totalPieces} piezas · {formatTime(elapsed)}
              </p>
            </div>
          </div>

          {/* Gemini summary text */}
          {analysisPreview.summary ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>
                {analysisPreview.summary}
              </p>
            </div>
          ) : null}

          {/* Nutrition grid */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '16px 18px', marginBottom: 20,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              {[
                { l: 'Calorías', v: analysisPreview.calories, u: 'kcal', c: '#FF9F0A' },
                { l: 'Proteína', v: analysisPreview.protein,  u: 'g',    c: '#32D74B' },
                { l: 'Carbos',   v: analysisPreview.carbs,    u: 'g',    c: '#5AC8FA' },
                { l: 'Grasa',    v: analysisPreview.fat,      u: 'g',    c: '#FFD60A' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: m.c, fontVariantNumeric: 'tabular-nums' }}>
                    {m.v}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>{m.u}</span>
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {/* Re-analyze with Gemini */}
            <button onClick={() => analyzeBuffet(false)} disabled={busy} style={{
              width: '100%', height: 46, borderRadius: 14,
              background: 'rgba(125,122,255,0.1)', border: '0.5px solid rgba(125,122,255,0.25)',
              color: busy && analyzingMode === 'gemini' ? 'rgba(168,166,255,0.3)' : '#A8A6FF',
              fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', touchAction: 'manipulation',
            }}>
              {busy && analyzingMode === 'gemini'
                ? <>{spinner('#A8A6FF', 14)}Analizando con Gemini…</>
                : '🔄 Pedir revisión a Gemini'}
            </button>

            {/* Edit pieces — go back to counter */}
            <button onClick={() => setAnalysisPreview(null)} disabled={busy} style={{
              width: '100%', height: 46, borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              color: busy ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
              fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', touchAction: 'manipulation',
            }}>
              ✏️ Editar piezas
            </button>

            {/* Use local estimate */}
            <button onClick={() => analyzeBuffet(true)} disabled={busy} style={{
              width: '100%', height: 46, borderRadius: 14,
              background: 'rgba(88,190,248,0.06)', border: '0.5px solid rgba(88,190,248,0.18)',
              color: busy && analyzingMode === 'local' ? 'rgba(88,190,248,0.3)' : 'rgba(88,190,248,0.75)',
              fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', touchAction: 'manipulation',
            }}>
              {busy && analyzingMode === 'local'
                ? <>{spinner('rgba(88,190,248,0.75)', 14)}Calculando local…</>
                : '📊 Usar estimación local'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

          {/* Save button */}
          <button onClick={saveBuffet} disabled={busy} style={{
            width: '100%', height: 56, borderRadius: 18,
            background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #dc143c 0%, #7a0015 100%)',
            border: busy ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(220,20,60,0.5)',
            color: saving ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize: 16, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: !busy ? '0 4px 28px rgba(220,20,60,0.38)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.3s', touchAction: 'manipulation',
          }}>
            {saving ? <>{spinner()}Guardando…</> : '💾 Guardar sesión'}
          </button>

          {error && <p style={{ marginTop: 12, fontSize: 12, color: '#ff8080', textAlign: 'center' }}>{error}</p>}
        </div>
        <style>{`@keyframes spinLoader { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Result screen (after save) ────────────────────────────────────────────
  if (finishedResult) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'linear-gradient(180deg, #0a0005 0%, #0d0008 60%, #120003 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: 'popIn 0.5s cubic-bezier(.36,.07,.19,.97)' }}>
          {finishedResult.is_record ? '🏆' : '🍣'}
        </div>

        {finishedResult.is_record && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,150,0,0.15))',
            border: '1px solid rgba(255,215,0,0.4)',
            borderRadius: 16, padding: '8px 20px', marginBottom: 16,
            fontSize: 13, fontWeight: 800, color: '#FFD700',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: '0 0 24px rgba(255,215,0,0.2)',
            animation: 'shimmer 2s ease-in-out infinite',
          }}>
            🏆 ¡Nuevo récord!
            {finishedResult.previous_record > 0 ? ` (antes: ${finishedResult.previous_record})` : ' ¡Primera sesión!'}
          </div>
        )}

        {finishedResult.is_first_session && !finishedResult.is_record && (
          <div style={{
            background: 'rgba(220,20,60,0.12)', border: '0.5px solid rgba(220,20,60,0.3)',
            borderRadius: 16, padding: '8px 20px', marginBottom: 16,
            fontSize: 13, fontWeight: 700, color: '#ff8099',
            animation: 'popIn 0.5s ease 0.2s both',
          }}>
            🍣 ¡Primera sesión completada!
          </div>
        )}

        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          {finishedResult.total_pieces} piezas
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
          {formatTime(elapsed)} de sesión
        </div>

        <div style={{
          width: '100%', maxWidth: 320,
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '20px 24px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px',
          marginBottom: finishedResult.summary ? 16 : 28,
        }}>
          {[
            { l: 'Calorías', v: Math.round(finishedResult.calories), u: 'kcal', c: '#FF9F0A' },
            { l: 'Proteína', v: Math.round(finishedResult.protein),  u: 'g',    c: '#32D74B' },
            { l: 'Carbos',   v: Math.round(finishedResult.carbs),    u: 'g',    c: '#5AC8FA' },
            { l: 'Grasa',    v: Math.round(finishedResult.fat),      u: 'g',    c: '#FFD60A' },
          ].map(m => (
            <div key={m.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.c, fontVariantNumeric: 'tabular-nums' }}>
                {m.v}<span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>{m.u}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>

        {finishedResult.summary ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5, marginBottom: 20 }}>
            {finishedResult.summary}
          </p>
        ) : null}

        <button onClick={() => { endSession() }} style={{
          width: '100%', maxWidth: 320, height: 56, borderRadius: 18,
          background: 'linear-gradient(135deg, #dc143c 0%, #8b0000 100%)',
          border: '0.5px solid rgba(220,20,60,0.5)',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(220,20,60,0.35)',
        }}>
          ¡Perfecto! Ver historial
        </button>

        <style>{`
          @keyframes popIn { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.2)} 80%{transform:scale(0.92)} 100%{transform:scale(1);opacity:1} }
          @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.7} }
        `}</style>
      </div>
    )
  }

  // ── Session counter screen ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'linear-gradient(180deg, #080004 0%, #0d0008 50%, #100004 100%)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>

      {/* Atmospheric glow */}
      <div style={{
        position: 'fixed', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 340, height: 220, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(180,0,40,0.22) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '52px 20px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: '#ff2d55',
            boxShadow: '0 0 8px #ff2d5580', animation: 'recordPulse 1.4s ease-in-out infinite', flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Sesión en curso
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsed)}
          </span>
        </div>
        <button onClick={handleClose} title="Minimizar" style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)',
          color: 'rgba(255,255,255,0.45)', fontSize: 20, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>−</button>
      </div>

      {/* Title + total */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '4px 0 0', flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
          Buffet de sushi
        </p>
        <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, color: '#fff', letterSpacing: '-4px', fontVariantNumeric: 'tabular-nums' }}>
          {totalPieces}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginTop: 2 }}>
          {totalPieces === 1 ? 'pieza' : 'piezas'}
        </p>
      </div>

      {/* Central tap button */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', margin: '16px 0 12px', flexShrink: 0 }}>
        <button
          ref={buttonRef}
          onPointerDown={() => setPressed(true)}
          onPointerUp={(e) => { setPressed(false); handleTap(e) }}
          onPointerLeave={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          style={{
            width: 152, height: 152, borderRadius: '50%',
            background: pressed
              ? 'radial-gradient(ellipse at 45% 38%, rgba(240,30,70,0.5) 0%, rgba(120,0,25,0.55) 55%, rgba(30,0,10,0.6) 100%)'
              : 'radial-gradient(ellipse at 45% 38%, rgba(220,20,60,0.38) 0%, rgba(100,0,20,0.43) 60%, rgba(20,0,8,0.5) 100%)',
            border: `1px solid rgba(220,20,60,${pressed ? 0.55 : 0.32})`,
            boxShadow: pressed
              ? '0 0 35px rgba(220,20,60,0.6), inset 0 3px 10px rgba(0,0,0,0.5)'
              : '0 0 55px rgba(180,0,30,0.32), 0 0 100px rgba(180,0,30,0.12), inset 0 1px 0 rgba(255,120,120,0.12)',
            cursor: 'pointer',
            transform: pressed ? 'scale(0.87)' : 'scale(1)',
            transition: pressed ? 'transform 0.08s ease, box-shadow 0.1s ease' : 'box-shadow 0.35s ease',
            userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 60, lineHeight: 1, zIndex: 1, position: 'relative', pointerEvents: 'none' }}>
            {EMOJIS[emojiIdx]}
          </span>
          {ripples.map(rp => (
            <span key={rp.id} style={{
              position: 'absolute', left: rp.x, top: rp.y,
              width: 10, height: 10, marginLeft: -5, marginTop: -5,
              borderRadius: '50%', background: 'rgba(255,255,255,0.45)',
              animation: 'rippleExpand 0.65s ease-out forwards',
              pointerEvents: 'none', zIndex: 0,
            }} />
          ))}
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500, marginBottom: 12, position: 'relative', zIndex: 1, flexShrink: 0 }}>
        Toca por cada pieza que comas
      </p>

      {/* Category grid */}
      <div style={{
        position: 'relative', zIndex: 1, padding: '0 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, alignContent: 'start',
      }}>
        {CATEGORIES.map(cat => {
          const count = breakdown[cat.id as CategoryId]
          return (
            <div key={cat.id} style={{
              background: count > 0 ? 'rgba(220,20,60,0.07)' : 'rgba(255,255,255,0.03)',
              border: count > 0 ? '0.5px solid rgba(220,20,60,0.22)' : '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '10px 10px 10px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{cat.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: count > 0 ? 'rgba(255,200,200,0.85)' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <button onClick={() => adjustCategory(cat.id as CategoryId, -1)} style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', touchAction: 'manipulation',
                }}>−</button>
                <span style={{
                  fontSize: 15, fontWeight: 800,
                  color: count > 0 ? '#ff6b81' : 'rgba(255,255,255,0.35)',
                  minWidth: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                  transition: 'color 0.2s',
                }}>{count}</span>
                <button onClick={() => adjustCategory(cat.id as CategoryId, 1)} style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(220,20,60,0.18)', border: '0.5px solid rgba(220,20,60,0.28)',
                  color: '#ff6b81', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', touchAction: 'manipulation',
                }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          position: 'relative', zIndex: 1, margin: '10px 14px 0',
          padding: '10px 14px',
          background: 'rgba(255,59,48,0.1)', border: '0.5px solid rgba(255,59,48,0.3)',
          borderRadius: 12, fontSize: 12, color: '#ff8080', textAlign: 'center',
        }}>{error}</div>
      )}

      {/* Finalizar + abandon */}
      <div style={{ position: 'relative', zIndex: 1, padding: '12px 14px 40px', flexShrink: 0 }}>
        <button
          onClick={() => analyzeBuffet(false)}
          disabled={analyzing || totalPieces === 0}
          style={{
            width: '100%', height: 56, borderRadius: 18,
            background: (totalPieces === 0 || analyzing) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #dc143c 0%, #7a0015 100%)',
            border: (totalPieces === 0 || analyzing) ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(220,20,60,0.5)',
            color: (totalPieces === 0 || analyzing) ? 'rgba(255,255,255,0.2)' : '#fff',
            fontSize: 16, fontWeight: 700,
            cursor: (totalPieces === 0 || analyzing) ? 'not-allowed' : 'pointer',
            boxShadow: (totalPieces > 0 && !analyzing) ? '0 4px 28px rgba(220,20,60,0.38)' : 'none',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            touchAction: 'manipulation',
          }}
        >
          {analyzing ? <>{spinner()}Analizando…</> : <>🎌 Finalizar sesión</>}
        </button>

        <button
          onClick={() => { if (confirm('¿Terminar la sesión sin guardar?')) endSession() }}
          style={{
            width: '100%', marginTop: 12, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.22)', fontSize: 12, cursor: 'pointer',
            textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.1)',
          }}
        >
          Terminar sin guardar
        </button>
      </div>

      <style>{`
        @keyframes sushiSpring { 0%{transform:scale(0.82)} 35%{transform:scale(1.16)} 60%{transform:scale(0.94)} 80%{transform:scale(1.05)} 100%{transform:scale(1)} }
        @keyframes rippleExpand { 0%{transform:scale(1);opacity:0.55} 100%{transform:scale(22);opacity:0} }
        @keyframes recordPulse { 0%,100%{opacity:1;box-shadow:0 0 8px #ff2d5580} 50%{opacity:0.35;box-shadow:0 0 4px #ff2d5540} }
        @keyframes spinLoader { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
