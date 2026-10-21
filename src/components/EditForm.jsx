import React, { useState } from 'react'
import { photoUrl } from '../utils/familyData.js'
import PhotoCropper from './PhotoCropper.jsx'

const TEXT_FIELDS = [
  ['firstName',  'Primer nombre'],
  ['middleName', 'Segundo nombre'],
  ['lastName',   'Apellido'],
  ['born',       'Nacimiento', 'dd/mm/aaaa'],
  ['died',       'Fallecimiento', 'dd/mm/aaaa — vacío si vive'],
]

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function ParentSelect({ value, onChange, member, allMembers }) {
  const options = allMembers.filter(m => m.id !== member.id).sort((a, b) => a.name.localeCompare(b.name))
  // Parents can reference people without their own row (e.g. in-laws); keep those selectable
  const orphan = value && !options.some(m => m.id === value)
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
      <option value="">— Ninguno —</option>
      {orphan && <option value={value}>{value} (sin ficha)</option>}
      {options.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  )
}

export default function EditForm({ member, allMembers, onSave, onUpload, onCancel }) {
  const [form, setForm] = useState(() => ({
    firstName:  member.firstName  ?? '',
    middleName: member.middleName ?? '',
    lastName:   member.lastName   ?? '',
    born:       member.born       ?? '',
    died:       member.died       ?? '',
    fatherId:   member.fatherId   ?? '',
    motherId:   member.motherId   ?? '',
    bio:        member.bio        ?? '',
    photo:      member.photoLink  ?? '',
  }))
  const [busy, setBusy]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile]   = useState(null)
  const [error, setError] = useState(null)
  const set = key => value => setForm(f => ({ ...f, [key]: value }))

  const submit = async e => {
    e.preventDefault()
    const original = { ...member, photo: member.photoLink ?? '' }
    const changes = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => v.trim() !== String(original[k] ?? '').trim())
    )
    if (!Object.keys(changes).length) return onCancel()
    setBusy(true)
    setError(null)
    try {
      await onSave(changes)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const pickPhoto = e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setCropFile(file)
  }

  const uploadCropped = async data => {
    setCropFile(null)
    setUploading(true)
    setError(null)
    try {
      set('photo')(await onUpload(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const preview = photoUrl(form.photo)

  return (
    <form onSubmit={submit} className="px-5 pb-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {TEXT_FIELDS.map(([key, label, placeholder]) => (
          <Field key={key} label={label}>
            <input value={form[key]} onChange={e => set(key)(e.target.value)} placeholder={placeholder} className={inputCls} />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Padre">
          <ParentSelect value={form.fatherId} onChange={set('fatherId')} member={member} allMembers={allMembers} />
        </Field>
        <Field label="Madre">
          <ParentSelect value={form.motherId} onChange={set('motherId')} member={member} allMembers={allMembers} />
        </Field>
      </div>

      <div>
        <span className="block text-xs font-semibold text-gray-500 mb-1">Foto</span>
        <div className="flex items-center gap-3">
          {preview
            ? <img src={preview} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 ring-1 ring-black/10" />
            : <div className="w-14 h-14 rounded-full shrink-0 bg-gray-100 ring-1 ring-black/5" />}
          <label className={`px-3 py-2 rounded-lg text-sm font-medium border border-violet-200 text-violet-700 bg-violet-50 ${uploading ? 'opacity-50' : 'hover:bg-violet-100 cursor-pointer'}`}>
            {uploading ? 'Subiendo…' : preview ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={pickPhoto} />
          </label>
        </div>
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer">o pegar un link de Google Drive</summary>
          <input value={form.photo} onChange={e => set('photo')(e.target.value)} placeholder="https://drive.google.com/file/d/…" className={`${inputCls} mt-1`} />
        </details>
      </div>

      <Field label="Biografía">
        <textarea value={form.bio} onChange={e => set('bio')(e.target.value)} rows={5} className={inputCls} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cropFile && <PhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={uploadCropped} />}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button disabled={busy || uploading} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
