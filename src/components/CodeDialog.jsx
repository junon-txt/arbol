import React, { useState } from 'react'
import { verifyCode } from '../utils/api.js'

export default function CodeDialog({ onSuccess, onClose }) {
  const [code, setCode]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const editor = await verifyCode(code)
      onSuccess({ code: code.trim(), editor })
    } catch (err) {
      setError(err.code === 'invalid_code' ? 'Código inválido o revocado.' : 'No se pudo verificar. Probá de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div data-code-dialog className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5">
        <h3 className="text-base font-semibold text-gray-900">Ingresar código</h3>
        <p className="text-sm text-gray-500 mt-1">Usá el código personal que te pasaron para poder editar.</p>
        <input
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="ABCD-1234"
          autoCapitalize="characters"
          autoComplete="off"
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button disabled={busy || !code.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white disabled:opacity-50">
            {busy ? 'Verificando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  )
}
