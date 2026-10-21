// Turns a raw row from the "Miembros" sheet into the shape the tree uses.

// Accepts any Google Drive share link (or a plain image URL) and returns something an <img> can load
export function photoUrl(link) {
  if (!link) return null
  const m = link.match(/\/d\/([\w-]{20,})/) || link.match(/[?&]id=([\w-]{20,})/)
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w600`
  return /^https?:\/\//.test(link) ? link : null
}

export function toMember(raw) {
  const name = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(' ')
  return {
    ...raw,
    name: name || raw.id,
    parents: [raw.fatherId, raw.motherId].filter(Boolean),
    photo: photoUrl(raw.photo),
    photoLink: raw.photo,
  }
}
