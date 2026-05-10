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

export default function BuffetSession() {
  const {
    session, fullscreen, finishedResult,
    addPiece, adjustCategory, setFullscreen, endSession,
    setFinishedResult,
  } = useBuffet()

  const [pressed, setPressed] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const [geminiFailState, setGeminiFailState] = useState<{
    local_estimate: { calories: number; protein: number; carbs: number; fat: number; summary: string }
    retrying: boolean
    savingLocal: boolean
  } | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const rippleId = useRef(0)

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
    if (finishing) return
    addPiece()
    triggerSpring()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId.current
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700)
  }

  async function callBuffetAPI(force_local = false) {
    if (!session) return
    const duration_minutes = Math.max(1, Math.round(elapsed / 60))
    const res = await fetch('/api/buffet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_pieces: session.totalPieces,
        breakdown: session.breakdown,
        duration_minutes,
        force_local,
      }),
    })
    return res
  }

  async function handleFinish() {
    if (!session || finishing || session.totalPieces === 0) return
    setFinishing(true)
    setError('')
    setGeminiFailState(null)
    try {
      const res = await callBuffetAPI(false)
      if (!res) { setFinishing(false); return }
      const data = await res.json()

      if (res.status === 503 && data.gemini_failed) {
        // Gemini unavailable — show choice UI
        setGeminiFailState({ local_estimate: data.local_estimate, retrying: false, savingLocal: false })
        setFinishing(false)
        return
      }

      if (!res.ok) { setError(data.error || 'Error al guardar'); setFinishing(false); return }
      setFinishedResult(data)
      setFinishing(false)
    } catch {
      setError('Error de conexión')
      setFinishing(false)
    }
  }

  async function handleRetryGemini() {
    if (!session || !geminiFailState) return
    setGeminiFailState(s => s ? { ...s, retrying: true } : s)
    try {
      const res = await callBuffetAPI(false)
      if (!res) { setGeminiFailState(s => s ? { ...s, retrying: false } : s); return }
      const data = await res.json()

      if (res.status === 503 && data.gemini_failed) {
        // Still failing
        setGeminiFailState(s => s ? { ...s, retrying: false } : s)
        return
      }
      if (!res.ok) {
        setGeminiFailState(s => s ? { ...s, retrying: false } : s)
        setError(data.error || 'Error al guardar')
        return
      }
      setGeminiFailState(null)
      setFinishedResult(data)
    } catch {
      setGeminiFailState(s => s ? { ...s, retrying: false } : s)
    }
  }

  async function handleUseLocal() {
    if (!session || !geminiFailState) return
    setGeminiFailState(s => s ? { ...s, savingLocal: true } : s)
    try {
      const res = await callBuffetAPI(true)
      if (!res) { setGeminiFailState(s => s ? { ...s, savingLocal: false } : s); return }
      const data = await res.json()
      if (!res.ok) {
        setGeminiFailState(s => s ? { ...s, savingLocal: false } : s)
        setError(data.error || 'Error al guardar')
        return
      }
      setGeminiFailState(null)
      setFinishedResult(data)
    } catch {
      setGeminiFailState(s => s ? { ...s, savingLocal: false } : s)
      setError('Error de conexión')
    }
  }

  function handleClose() {
    // × minimizes to mini bar — doesn't destroy the session
    setFullscreen(false)
  }

  const totalPieces = session.totalPieces
  const breakdown   = session.breakdown
  const emojiIdx    = session.emojiIdx

  // ── Gemini failed: offer retry or local estimate ───────────────────────────
  if (geminiFailState) {
    const { local_estimate, retrying, savingLocal } = geminiFailState
    const busy = retrying || savingLocal
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'linear-gradient(180deg, #080004 0%, #0d0008 60%, #100004 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 22, marginBottom: 20,
          background: 'rgba(255,159,10,0.1)',
          border: '1px solid rgba(255,159,10,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34,
        }}>⚠️</div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
          Gemini no está disponible
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: 280, lineHeight: 1.55, marginBottom: 28 }}>
          No se pudo conectar con la IA para analizar tu sesión. Puedes volver a intentarlo o guardar con la estimación local.
        </p>

        {/* Local estimate preview */}
        <div style={{
          width: '100%', maxWidth: 320,
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 18, padding: '16px 20px',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12, textAlign: 'center' }}>
            Estimación local · {session?.totalPieces} piezas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            {[
              { l: 'Calorías', v: local_estimate.calories, u: 'kcal', c: '#FF9F0A' },
              { l: 'Proteína', v: local_estimate.protein,  u: 'g',    c: '#32D74B' },
              { l: 'Carbos',   v: local_estimate.carbs,    u: 'g',    c: '#5AC8FA' },
              { l: 'Grasa',    v: local_estimate.fat,      u: 'g',    c: '#FFD60A' },
            ].map(m => (
              <div key={m.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: m.c, fontVariantNumeric: 'tabular-nums' }}>
                  {m.v}<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>{m.u}</span>
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {m.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retry button */}
        <button
          onClick={handleRetryGemini}
          disabled={busy}
          style={{
            width: '100%', maxWidth: 320, height: 52, borderRadius: 16, marginBottom: 10,
            background: busy ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #dc143c 0%, #7a0015 100%)',
            border: busy ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(220,20,60,0.5)',
            color: busy ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: !busy ? '0 4px 20px rgba(220,20,60,0.3)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.25s',
          }}
        >
          {retrying ? (
            <>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spinLoader 0.7s linear infinite', display: 'inline-block' }} />
              Reintentando…
            </>
          ) : '🔄 Reintentar con Gemini'}
        </button>

        {/* Use local estimate button */}
        <button
          onClick={handleUseLocal}
          disabled={busy}
          style={{
            width: '100%', maxWidth: 320, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: busy ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
            fontSize: 15, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.25s',
          }}
        >
          {savingLocal ? (
            <>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spinLoader 0.7s linear infinite', display: 'inline-block' }} />
              Guardando…
            </>
          ) : '📊 Usar estimación local'}
        </button>

        {error && (
          <p style={{ marginTop: 14, fontSize: 12, color: '#ff8080', textAlign: 'center' }}>{error}</p>
        )}

        <style>{`
          @keyframes spinLoader { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  // ── Result screen ──────────────────────────────────────────────────────────
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
            {finishedResult.previous_record > 0
              ? ` (antes: ${finishedResult.previous_record})`
              : ' ¡Primera sesión!'}
          </div>
        )}

        {finishedResult.is_first_session && !finishedResult.is_record && (
          <div style={{
            background: 'rgba(220,20,60,0.12)',
            border: '0.5px solid rgba(220,20,60,0.3)',
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
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
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
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {m.l}
              </div>
            </div>
          ))}
        </div>

        {finishedResult.summary ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', textAlign: 'center', maxWidth: 280, lineHeight: 1.5, marginBottom: 20 }}>
            {finishedResult.summary}
          </p>
        ) : null}

        <button
          onClick={() => { endSession() }}
          style={{
            width: '100%', maxWidth: 320, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #dc143c 0%, #8b0000 100%)',
            border: '0.5px solid rgba(220,20,60,0.5)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(220,20,60,0.35)',
          }}
        >
          ¡Perfecto! Ver historial
        </button>

        <style>{`
          @keyframes popIn {
            0%   { transform: scale(0.3); opacity: 0; }
            60%  { transform: scale(1.2); }
            80%  { transform: scale(0.92); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    )
  }

  // ── Session screen ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'linear-gradient(180deg, #080004 0%, #0d0008 50%, #100004 100%)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>

      {/* Atmospheric glows */}
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ff2d55',
            boxShadow: '0 0 8px #ff2d5580',
            animation: 'recordPulse 1.4s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Sesión en curso
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsed)}
          </span>
        </div>
        {/* × = minimize to mini bar, not end session */}
        <button
          onClick={handleClose}
          title="Minimizar (la sesión continúa)"
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 20, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >−</button>
      </div>

      {/* Title + total */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '4px 0 0', flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
          Buffet de sushi
        </p>
        <div style={{
          fontSize: 80, fontWeight: 900, lineHeight: 1, color: '#fff',
          letterSpacing: '-4px', fontVariantNumeric: 'tabular-nums',
        }}>
          {totalPieces}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginTop: 2 }}>
          {totalPieces === 1 ? 'pieza' : 'piezas'}
        </p>
      </div>

      {/* Central tap button */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'center',
        margin: '16px 0 12px', flexShrink: 0,
      }}>
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
            userSelect: 'none', WebkitUserSelect: 'none',
            touchAction: 'manipulation',
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
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.06)', pointerEvents: 'none',
          }} />
        </button>
      </div>

      <p style={{
        textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)',
        fontWeight: 500, marginBottom: 12, position: 'relative', zIndex: 1, flexShrink: 0,
      }}>
        Toca por cada pieza que comas
      </p>

      {/* Category grid */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '0 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, flex: 1, alignContent: 'start',
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
                <button onClick={() => adjustCategory(cat.id as CategoryId, -1)}
                  style={{
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
                <button onClick={() => adjustCategory(cat.id as CategoryId, 1)}
                  style={{
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
          onClick={handleFinish}
          disabled={finishing || totalPieces === 0}
          style={{
            width: '100%', height: 56, borderRadius: 18,
            background: (totalPieces === 0 || finishing) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #dc143c 0%, #7a0015 100%)',
            border: (totalPieces === 0 || finishing) ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(220,20,60,0.5)',
            color: (totalPieces === 0 || finishing) ? 'rgba(255,255,255,0.2)' : '#fff',
            fontSize: 16, fontWeight: 700,
            cursor: (totalPieces === 0 || finishing) ? 'not-allowed' : 'pointer',
            boxShadow: (totalPieces > 0 && !finishing) ? '0 4px 28px rgba(220,20,60,0.38)' : 'none',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            touchAction: 'manipulation',
          }}
        >
          {finishing ? (
            <>
              <span style={{
                width: 17, height: 17, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
                animation: 'spinLoader 0.7s linear infinite', display: 'inline-block',
              }} />
              Calculando nutrición…
            </>
          ) : <>🎌 Finalizar sesión</>}
        </button>

        {/* Abandon session link */}
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
        @keyframes sushiSpring {
          0%   { transform: scale(0.82); }
          35%  { transform: scale(1.16); }
          60%  { transform: scale(0.94); }
          80%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes rippleExpand {
          0%   { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(22); opacity: 0; }
        }
        @keyframes recordPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #ff2d5580; }
          50% { opacity: 0.35; box-shadow: 0 0 4px #ff2d5540; }
        }
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
