import React, { useEffect, useState } from 'react'
import { marked } from 'marked'
import { nameToGradient, initials } from '../utils/avatar.js'
import EditForm from './EditForm.jsx'

marked.setOptions({ breaks: true })

function Avatar({ member, size = 48, onClick, ring = false }) {
  return (
    <button
      onClick={onClick}
      className={[
        // block: as an inline element it gets a text-baseline gap below, making the frame around it oval
        'block rounded-full overflow-hidden shrink-0 transition-all duration-150',
        ring ? 'ring-2 ring-white' : '',
        onClick ? 'hover:scale-105 hover:ring-2 hover:ring-violet-400 cursor-pointer' : 'cursor-default',
      ].join(' ')}
      style={{ width: size, height: size, background: member.photo ? '#fff' : nameToGradient(member.name) }}
    >
      {member.photo ? (
        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-white font-semibold" style={{ fontSize: size * 0.32 }}>
          {initials(member.name)}
        </span>
      )}
    </button>
  )
}

function RelSection({ title, people, onNavigate }) {
  if (!people.length) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="flex flex-wrap gap-4">
        {people.map(p => (
          <div key={p.id} className="flex flex-col items-center gap-1.5" style={{ maxWidth: 64 }}>
            <Avatar member={p} size={48} onClick={() => onNavigate(p.id)} />
            <span className="text-xs text-gray-600 text-center leading-tight truncate w-full">{p.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileModal({ member, allMembers, onClose, onNavigate, requireSession, onSave, onUpload }) {
  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [member.id])

  const byId = Object.fromEntries(allMembers.map(m => [m.id, m]))
  const parents  = (member.parents ?? []).map(id => byId[id]).filter(Boolean)
  const children = allMembers.filter(m => (m.parents ?? []).includes(member.id))
  const siblings = allMembers.filter(m =>
    m.id !== member.id && (m.parents ?? []).some(p => (member.parents ?? []).includes(p))
  )
  const dates = [member.born && `Nació ${member.born}`, member.died && `Falleció ${member.died}`].filter(Boolean).join(' · ')
  const bioHtml = member.bio ? marked.parse(member.bio) : null
  const hasFamily = parents.length || children.length || siblings.length

  useEffect(() => {
    // Escape only closes when nothing is stacked on top (code dialog) and no edit is in progress
    const h = e => e.key === 'Escape' && !editing && !document.querySelector('[data-code-dialog]') && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, editing])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / card */}
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-[slideUp_0.22s_ease]">

        {/* Cover: a soft blur of the photo (a wide crop of a portrait looks random), else the gradient */}
        <div
          className="relative shrink-0 h-24 overflow-hidden"
          style={member.photo ? undefined : { background: nameToGradient(member.name) }}
        >
          {member.photo && (
            <>
              <img src={member.photo} alt="" className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl saturate-150" draggable={false} />
              <div className="absolute inset-0 bg-white/20" />
            </>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Profile header — outside the scroll area so the overlapping avatar isn't clipped,
            and stacked (relative z-10) above the positioned cover, which would otherwise paint over it */}
        <div className="relative z-10 shrink-0 px-5 pb-4 border-b border-gray-100">
          <div className="-mt-12 mb-3 flex items-end justify-between">
            <div className="shrink-0 rounded-full p-1 bg-white shadow-md">
              <Avatar member={member} size={96} />
            </div>
            {!editing && (
              <button
                onClick={() => requireSession().then(() => setEditing(true))}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100"
              >
                Editar
              </button>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{member.name}</h2>
          {dates && <p className="text-sm text-gray-500 mt-0.5 tabular-nums">{dates}</p>}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pt-4">

          {editing && (
            <EditForm
              member={member}
              allMembers={allMembers}
              onCancel={() => setEditing(false)}
              onSave={async changes => { await onSave(member.id, changes); setEditing(false) }}
              onUpload={data => onUpload(member.id, data)}
            />
          )}

          {/* Bio */}
          {!editing && bioHtml && (
            <div
              className="px-5 pb-5 prose prose-sm prose-gray max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: bioHtml }}
            />
          )}

          {/* Family connections */}
          {!editing && hasFamily && (
            <div className={`px-5 pb-5 ${bioHtml ? 'pt-5 border-t border-gray-100' : ''}`}>
              <RelSection title="Padres"   people={parents}  onNavigate={onNavigate} />
              <RelSection title="Hermanos" people={siblings} onNavigate={onNavigate} />
              <RelSection title="Hijos"    people={children} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>
  )
}
