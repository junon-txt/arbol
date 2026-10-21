import React, { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'

const OUTPUT_SIZE = 800   // px, square — avatars are circles and the cover is a blur of the same image

// Draws the selected square of the image onto a canvas; resolves with base64 JPEG (no data: prefix)
function cropToJpeg(src, area) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = Math.min(OUTPUT_SIZE, area.width)
      canvas.getContext('2d').drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.88).split(',')[1])
    }
    img.onerror = reject
    img.src = src
  })
}

export default function PhotoCropper({ file, onCancel, onConfirm }) {
  const [src, setSrc]       = useState(null)
  const [crop, setCrop]     = useState({ x: 0, y: 0 })
  const [zoom, setZoom]     = useState(1)
  const [area, setArea]     = useState(null)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    // Catch formats the browser can't decode (e.g. HEIC on desktop) before showing the cropper
    const probe = new Image()
    probe.onerror = () => setBroken(true)
    probe.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const confirm = async () => onConfirm(await cropToJpeg(src, area))

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="relative h-80 bg-gray-900">
          {broken ? (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
              No se pudo abrir esta imagen. Probá con una foto JPG o PNG.
            </p>
          ) : src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              maxZoom={5}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <div className="p-4 space-y-4">
          <label className="flex items-center gap-3 text-xs text-gray-500">
            <span>Zoom</span>
            <input
              type="range" min={1} max={5} step={0.01} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
          </label>
          <p className="text-xs text-gray-400 -mt-2">Arrastrá la foto para elegir qué se ve en el círculo.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button
              type="button"
              disabled={!area || broken}
              onClick={confirm}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white disabled:opacity-50"
            >
              Usar esta foto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
