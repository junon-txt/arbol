export function nameToGradient(name) {
  if (!name) return 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const h1 = Math.abs(h % 360)
  const h2 = (h1 + 45) % 360
  return `linear-gradient(135deg, hsl(${h1},60%,55%), hsl(${h2},65%,42%))`
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// Dates come from the sheet as free text ("07/03/1993", "02/04", "2 de marzo?"); show years when present
const year = d => String(d ?? '').match(/\b(1[89]|20)\d{2}\b/)?.[0]

export function yearsDisplay(m) {
  const b = year(m.born), d = year(m.died)
  if (b && d) return `${b}–${d}`
  if (d) return `†${d}`
  if (b) return m.died ? `${b}–?` : b
  return m.died ? '†' : ''
}
