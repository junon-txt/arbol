// Parse YAML-ish frontmatter without a dependency
function parseMd(raw) {
  const m = raw.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, content: raw }

  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim()
    let val = line.slice(colon + 1).trim()

    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    } else if (val === '' || val === 'null') {
      val = null
    } else if (!isNaN(val)) {
      val = Number(val)
    } else if (/^['"].*['"]$/.test(val)) {
      val = val.slice(1, -1)
    }

    data[key] = val
  }

  return { data, content: m[2].trim() }
}

const rawMds = import.meta.glob('../assets/members/*/profile.md', { query: '?raw', import: 'default', eager: true })
const rawImgs = import.meta.glob('../assets/members/**/*.{jpg,jpeg,png,webp,gif}', { eager: true })

function buildImageMap() {
  const map = {}
  for (const [path, mod] of Object.entries(rawImgs)) {
    const segs = path.split('/')
    const mi = segs.lastIndexOf('members')
    if (mi === -1) continue
    const dir = segs[mi + 1]
    const rest = segs.slice(mi + 2).join('/')
    if (!map[dir]) map[dir] = {}
    map[dir][rest] = mod.default
  }
  return map
}

let _cache = null

export function loadFamilyData() {
  if (_cache) return _cache

  const imgMap = buildImageMap()

  _cache = Object.entries(rawMds).flatMap(([path, raw]) => {
    const { data, content } = parseMd(raw)
    const segs = path.split('/')
    const mi = segs.lastIndexOf('members')
    const dir = segs[mi + 1]
    const id = data.id || dir
    const imgs = imgMap[dir] || {}

    const photo = data.photo
      ? imgs[data.photo]
      : imgs['photo.jpg'] ?? imgs['photo.jpeg'] ?? imgs['photo.png'] ?? null

    const member = {
      generation: 0,
      col: 0,
      parents: [],
      ...data,
      id,
      bio: content,
      photo,
    }
    if (!member.name) {
      console.warn(`[arbol] skipping ${path}: no "name" field in frontmatter`)
      return []
    }
    return [member]
  })

  return _cache
}
