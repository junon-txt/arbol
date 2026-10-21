import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMembers, updateMember, uploadPhoto, ApiError } from './utils/api.js'
import { toMember } from './utils/familyData.js'
import { computeLayout, buildLines } from './utils/layout.js'
import TreeView from './components/TreeView.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import CodeDialog from './components/CodeDialog.jsx'

const SESSION_KEY = 'arbol.session'

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable: session lasts for this tab only */ }
}

const ERRORS = {
  missing_api_url: 'Falta configurar VITE_API_URL (la URL del Apps Script).',
  invalid_code: 'Tu código ya no es válido. Pedí uno nuevo.',
  bad_image: 'No se pudo leer la imagen. Probá con una foto JPG o PNG.',
  too_large: 'La foto es demasiado grande.',
}
const errorText = err => ERRORS[err?.code]
  ?? (err?.code === 'server_error' ? `Error en la planilla: ${err.detail}` : 'No se pudo conectar con la planilla. Probá de nuevo más tarde.')

export default function App() {
  const [raw, setRaw]           = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [session, setSession]   = useState(loadSession)
  const [askCode, setAskCode]   = useState(null)   // callback to run after a successful login

  const load = useCallback(() => {
    setLoadError(null)
    fetchMembers().then(setRaw).catch(setLoadError)
  }, [])
  useEffect(load, [load])

  const { positioned, lines } = useMemo(() => {
    const positioned = computeLayout((raw ?? []).map(toMember))
    return { positioned, lines: buildLines(positioned) }
  }, [raw])

  const selectedMember = selected ? positioned.find(m => m.id === selected) : null

  const login = s => { saveSession(s); setSession(s) }
  const logout = () => { saveSession(null); setSession(null) }

  // Resolves with the session, asking for a code first if needed
  const requireSession = () => session
    ? Promise.resolve(session)
    : new Promise(resolve => setAskCode(() => resolve))

  // Runs an API call with the session code; turns failures into user-facing messages
  const withSession = async fn => {
    try {
      return await fn(session.code)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_code') logout()
      throw new Error(errorText(err))
    }
  }

  const save = (id, changes) => withSession(async code => {
    const updated = await updateMember(code, id, changes)
    setRaw(list => list.map(m => (m.id === id ? updated : m)))
  })

  const upload = (id, data) => withSession(code => uploadPhoto(code, id, data))

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="shrink-0 h-14 bg-white border-b border-gray-200 shadow-sm flex items-center gap-3 px-5 z-10">
        <svg viewBox="0 0 20 20" className="w-5 h-5 text-violet-500 shrink-0" fill="currentColor">
          <path d="M10 2a1 1 0 011 1v1.07A7.002 7.002 0 0116.93 10H18a1 1 0 110 2h-1.07A7.002 7.002 0 0111 17.93V19a1 1 0 11-2 0v-1.07A7.002 7.002 0 013.07 12H2a1 1 0 110-2h1.07A7.002 7.002 0 019 4.07V3a1 1 0 011-1zm0 4a5 5 0 100 10A5 5 0 0010 6z" />
        </svg>
        <span className="text-base font-semibold text-gray-900 tracking-tight">Árbol Genealógico</span>
        {raw && <span className="ml-1 text-sm text-gray-400 hidden sm:inline">{positioned.length} familiares</span>}

        <div className="ml-auto flex items-center gap-2 text-sm">
          {session ? (
            <>
              <span className="text-gray-500 hidden sm:inline">Editando como <b className="text-gray-800">{session.editor}</b></span>
              <button onClick={logout} className="px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100">Salir</button>
            </>
          ) : (
            <button onClick={() => requireSession()} className="px-3 py-1.5 rounded-full text-violet-600 hover:bg-violet-50 font-medium">
              Ingresar código
            </button>
          )}
        </div>
      </header>

      {/* Tree canvas */}
      <div className="flex-1 overflow-hidden">
        {raw ? (
          <TreeView
            members={positioned}
            lines={lines}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-gray-500 px-6 text-center">
            {loadError ? (
              <>
                <p>{errorText(loadError)}</p>
                <button onClick={load} className="px-4 py-2 rounded-full bg-violet-600 text-white font-medium">Reintentar</button>
              </>
            ) : (
              <p>Cargando árbol…</p>
            )}
          </div>
        )}
      </div>

      {/* Profile overlay */}
      {selectedMember && (
        <ProfileModal
          member={selectedMember}
          allMembers={positioned}
          onClose={() => setSelected(null)}
          onNavigate={id => setSelected(id)}
          requireSession={requireSession}
          onSave={save}
          onUpload={upload}
        />
      )}

      {askCode && (
        <CodeDialog
          onSuccess={s => { login(s); askCode(s); setAskCode(null) }}
          onClose={() => setAskCode(null)}
        />
      )}
    </div>
  )
}
