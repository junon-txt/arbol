// Client for the Apps Script web app (see apps-script/Code.gs).
// POSTs use text/plain so the browser skips the CORS preflight Apps Script can't answer.

export const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code)
    this.code = code
    this.detail = detail
  }
}

async function call(init) {
  if (!API_URL) throw new ApiError('missing_api_url')
  const res = await fetch(API_URL, init)
  if (!res.ok) throw new ApiError(`http_${res.status}`)
  const body = await res.json()
  if (!body.ok) throw new ApiError(body.error || 'unknown', body.message)
  return body
}

const post = payload => call({
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload),
})

export async function fetchMembers() {
  const { members } = await call({ cache: 'no-store' })
  return members
}

export async function verifyCode(code) {
  const { editor } = await post({ action: 'verify', code })
  return editor
}

// `data` is a base64 JPEG, already cropped and resized in the browser (PhotoCropper).
// Resolves with the Drive share link to store in the member's "photo" field.
export async function uploadPhoto(code, id, data) {
  const { link } = await post({ action: 'upload', code, id, mimeType: 'image/jpeg', data })
  return link
}

export async function updateMember(code, id, changes) {
  const { member } = await post({ action: 'update', code, id, changes })
  return member
}
