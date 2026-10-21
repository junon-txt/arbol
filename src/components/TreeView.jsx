import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import PersonNode from './PersonNode.jsx'
import { AVATAR } from '../utils/layout.js'

const PAD = 80

export default function TreeView({ members, lines, selected, onSelect }) {
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const touchRef = useRef(null)
  const [tf, setTf] = useState({ x: PAD, y: PAD, scale: 1 })

  const maxX = Math.max(...members.map(m => m.x), 0) + AVATAR + PAD
  const maxY = Math.max(...members.map(m => m.y), 0) + AVATAR + 60 + PAD

  // Center the tree in the viewport on first render
  useLayoutEffect(() => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || !members.length) return
    const scaleX = rect.width / maxX
    const scaleY = rect.height / maxY
    const scale = Math.min(scaleX, scaleY, 1)
    setTf({
      scale,
      x: (rect.width - maxX * scale) / 2,
      y: Math.max(PAD, (rect.height - maxY * scale) / 2),
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drag (pointer) ── */
  // Touch is handled by the touch handlers below (they also do pinch), so ignore it here
  const onPointerDown = useCallback(e => {
    if (e.pointerType === 'touch' || e.target.closest('[data-person]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { sx: e.clientX - tf.x, sy: e.clientY - tf.y }
  }, [tf])

  const onPointerMove = useCallback(e => {
    const drag = dragRef.current
    if (!drag) return
    // Read the ref now: the updater runs later, when a pointerup may already have cleared it
    setTf(t => ({ ...t, x: e.clientX - drag.sx, y: e.clientY - drag.sy }))
  }, [])

  const onPointerUp = useCallback(() => { dragRef.current = null }, [])

  /* ── Wheel zoom ── */
  // Attached natively: React's wheel listener is passive, so preventDefault() there wouldn't stop page scroll
  useEffect(() => {
    const el = wrapRef.current
    const onWheel = e => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      setTf(t => {
        const next = Math.min(3, Math.max(0.2, t.scale * (e.deltaY > 0 ? 0.9 : 1.1)))
        const r = next / t.scale
        return { scale: next, x: ox - (ox - t.x) * r, y: oy - (oy - t.y) * r }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ── Touch ── */
  const onTouchStart = useCallback(e => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      touchRef.current = { dist: d, scale: tf.scale }
    } else {
      dragRef.current = { sx: e.touches[0].clientX - tf.x, sy: e.touches[0].clientY - tf.y }
    }
  }, [tf])

  const onTouchMove = useCallback(e => {
    e.preventDefault()
    if (e.touches.length === 2 && touchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      const next = Math.min(3, Math.max(0.2, touchRef.current.scale * (d / touchRef.current.dist)))
      setTf(t => ({ ...t, scale: next }))
    } else if (e.touches.length === 1 && dragRef.current) {
      const drag = dragRef.current
      const { clientX, clientY } = e.touches[0]
      setTf(t => ({ ...t, x: clientX - drag.sx, y: clientY - drag.sy }))
    }
  }, [])

  const onTouchEnd = useCallback(() => { dragRef.current = null; touchRef.current = null }, [])

  return (
    <div
      ref={wrapRef}
      // relative: clip the canvas to this box; select-none: a drag must not start a text
      // selection, which makes the browser auto-scroll the whole page out of view
      className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* Transformed canvas */}
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.scale})`,
          width: maxX,
          height: maxY,
        }}
      >
        {/* Connection lines */}
        <svg
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          width={maxX}
          height={maxY}
        >
          {lines.map(({ key, d }) => (
            <path key={key} d={d} fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          ))}
        </svg>

        {/* Person nodes */}
        {members.map(m => (
          <PersonNode
            key={m.id}
            member={m}
            isSelected={m.id === selected}
            onClick={e => { e.stopPropagation(); onSelect(m.id) }}
          />
        ))}
      </div>

      {/* HUD — zoom buttons */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5">
        {[['＋', 1.2], ['－', 1 / 1.2]].map(([label, factor]) => (
          <button
            key={label}
            onClick={() => setTf(t => ({ ...t, scale: Math.min(3, Math.max(0.2, t.scale * factor)) }))}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors flex items-center justify-center text-base font-medium"
          >
            {label}
          </button>
        ))}
      </div>

      {/* HUD — hint */}
      <p className="absolute bottom-5 left-5 text-xs text-gray-400 bg-white/70 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
        Scroll to zoom · drag to pan · tap a portrait
      </p>
    </div>
  )
}
