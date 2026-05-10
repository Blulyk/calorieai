'use client'

import { useState, useEffect } from 'react'
import { useBuffet } from '@/lib/buffetContext'

const EMOJIS = ['🍣', '🦐', '🐟', '🌀', '🍱', '🥢', '🍤', '🫙', '🍙', '🎏', '🦑', '🐙']

export default function BuffetMiniBar() {
  const { session, fullscreen, setFullscreen, addPiece } = useBuffet()
  const [elapsed, setElapsed] = useState(0)
  const [pressed, setPressed] = useState(false)
  const [plusPressed, setPlusPressed] = useState(false)

  useEffect(() => {
    if (!session) return
    const update = () => setElapsed(Math.floor((Date.now() - session.startTime) / 1000))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [session])

  // Only show when session is active but NOT in full screen
  if (!session || fullscreen) return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          // Sit just above the BottomNav (height 68 + 12 bottom offset + 8 gap)
          bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
          left: '12px',
          right: '12px',
          maxWidth: '520px',
          marginLeft: 'auto',
          marginRight: 'auto',
          zIndex: 200,
          animation: 'miniBarSlideUp 0.38s cubic-bezier(.5,1.4,.4,1)',
        }}
      >
        <div style={{
          height: 56,
          borderRadius: 9999,
          background: 'rgba(18, 2, 6, 0.88)',
          backdropFilter: 'blur(24px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
          border: '0.5px solid rgba(220,20,60,0.28)',
          boxShadow: '0 0 30px rgba(180,0,30,0.2), 0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8,
          paddingRight: 8,
          gap: 0,
          overflow: 'hidden',
        }}>
          {/* Emoji icon */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'radial-gradient(ellipse, rgba(220,20,60,0.35) 0%, rgba(60,0,12,0.5) 100%)',
            border: '0.5px solid rgba(220,20,60,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {EMOJIS[session.emojiIdx]}
          </div>

          {/* Info — tapping expands to full screen */}
          <button
            onClick={() => setFullscreen(true)}
            style={{
              flex: 1, minWidth: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              touchAction: 'manipulation',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,220,220,0.9)', letterSpacing: '0.01em', lineHeight: 1.2 }}>
              Buffet en curso
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
              {session.totalPieces} {session.totalPieces === 1 ? 'pieza' : 'piezas'} · {formatTime(elapsed)}
            </span>
          </button>

          {/* Quick +1 piece button */}
          <button
            onPointerDown={() => setPlusPressed(true)}
            onPointerUp={() => { setPlusPressed(false); addPiece() }}
            onPointerLeave={() => setPlusPressed(false)}
            onPointerCancel={() => setPlusPressed(false)}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: plusPressed ? 'rgba(220,20,60,0.4)' : 'rgba(220,20,60,0.18)',
              border: '0.5px solid rgba(220,20,60,0.35)',
              color: '#ff8099', fontSize: 20, fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', touchAction: 'manipulation',
              transform: plusPressed ? 'scale(0.88)' : 'scale(1)',
              transition: plusPressed ? 'transform 0.08s' : 'transform 0.3s cubic-bezier(.5,1.4,.4,1), background 0.15s',
            }}
          >
            +
          </button>

          {/* Expand chevron */}
          <button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => { setPressed(false); setFullscreen(true) }}
            onPointerLeave={() => setPressed(false)}
            onPointerCancel={() => setPressed(false)}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginLeft: 4,
              background: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', touchAction: 'manipulation',
              transform: pressed ? 'scale(0.9)' : 'scale(1)',
              transition: 'transform 0.15s, background 0.15s',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes miniBarSlideUp {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
