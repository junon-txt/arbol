export const AVATAR  = 80
export const COL_GAP = 160   // width of one leaf slot in pixels
export const GEN_GAP = 220

// ── Pass 0: generations (topological) ────────────────────────────────────────
function computeGenerations(members, byId) {
  const gen = Object.fromEntries(members.map(m => [m.id, 0]))
  let changed = true, guard = 0
  while (changed && guard++ < 200) {
    changed = false
    for (const m of members) {
      const parents = (m.parents ?? []).filter(p => byId[p])
      if (!parents.length) continue
      const next = Math.max(...parents.map(p => gen[p])) + 1
      if (next !== gen[m.id]) { gen[m.id] = next; changed = true }
    }
  }
  return gen
}

// ── Pass 1 (bottom-up): subtree widths ───────────────────────────────────────
// Each child is "owned" by its first listed parent that exists in the tree.
// A node's width = number of leaf slots its owned subtree needs.
function computeWidths(members, byId, gen) {
  const ownedChildren = Object.fromEntries(members.map(m => [m.id, []]))
  for (const m of members) {
    const primary = (m.parents ?? []).find(p => byId[p])
    if (primary) ownedChildren[primary].push(m.id)
  }

  // Process leaves first (highest generation first)
  const sorted = [...members].sort((a, b) => (gen[b.id] ?? 0) - (gen[a.id] ?? 0))
  const width  = Object.fromEntries(members.map(m => [m.id, 1]))
  for (const m of sorted) {
    const owned = ownedChildren[m.id]
    if (owned.length) width[m.id] = owned.reduce((s, id) => s + width[id], 0)
  }

  return width
}

// ── Pass 2 (top-down): assign x centers ──────────────────────────────────────
function preferredX(member, xPos, byId) {
  const ps = (member.parents ?? []).filter(p => byId[p] && xPos[p] !== undefined)
  if (!ps.length) return null
  return ps.reduce((s, p) => s + xPos[p], 0) / ps.length
}

export function computeLayout(members) {
  if (!members.length) return []

  const byId  = Object.fromEntries(members.map(m => [m.id, m]))
  const gen   = computeGenerations(members, byId)
  const width = computeWidths(members, byId, gen)

  const byGen  = {}
  for (const m of members) {
    const g = gen[m.id]
    if (!byGen[g]) byGen[g] = []
    byGen[g].push(m)
  }

  const maxGen = Math.max(0, ...Object.values(gen))
  const xPos   = {}   // id → center in slot-units

  for (let g = 0; g <= maxGen; g++) {
    const group = (byGen[g] ?? []).slice()
    if (!group.length) continue

    // Preferred x = average of already-placed parents
    const pref = new Map(group.map(m => [m.id, preferredX(m, xPos, byId)]))

    // Sort constrained nodes by preferred x, unconstrained by id (stable tie-break)
    group.sort((a, b) => {
      const ax = pref.get(a.id) ?? Infinity
      const bx = pref.get(b.id) ?? Infinity
      return ax !== bx ? ax - bx : a.id < b.id ? -1 : 1
    })

    // Greedy placement — each node reserves width[node] slot-units
    const placed    = []
    let rightEdge   = null   // right edge of last placed node's slot

    for (const m of group) {
      const p = pref.get(m.id)
      const w = width[m.id]

      let center
      if (rightEdge === null) {
        // First node: place at preferred x or at its natural half-width from 0
        center = p !== null ? p : w / 2
      } else {
        const minCenter = rightEdge + w / 2   // must not overlap previous
        center = p !== null ? Math.max(p, minCenter) : minCenter
      }

      placed.push({ m, center })
      rightEdge = center + w / 2
    }

    // Centering correction: shift all nodes so constrained ones sit on their ideal average
    const constrained = placed.filter(({ m }) => pref.get(m.id) !== null)
    if (constrained.length) {
      const idealAvg  = constrained.reduce((s, { m }) => s + pref.get(m.id), 0) / constrained.length
      const actualAvg = constrained.reduce((s, { center }) => s + center, 0) / constrained.length
      const shift = idealAvg - actualAvg
      for (const p of placed) p.center += shift
    }

    for (const { m, center } of placed) xPos[m.id] = center
  }

  // Normalize: shift so the leftmost slot edge is at 0
  const minSlotLeft = Math.min(...Object.entries(xPos).map(([id, x]) => x - (width[id] ?? 1) / 2))
  const offset = -minSlotLeft

  return members.map(m => ({
    ...m,
    // CSS `left` = pixel center − half avatar
    x: ((xPos[m.id] ?? 0) + offset) * COL_GAP - AVATAR / 2,
    y: (gen[m.id] ?? 0) * GEN_GAP,
  }))
}

// ── Lines ─────────────────────────────────────────────────────────────────────
export function buildLines(positioned) {
  const byId = Object.fromEntries(positioned.map(m => [m.id, m]))
  return positioned.flatMap(child =>
    (child.parents ?? [])
      .filter(pid => byId[pid])
      .map(pid => {
        const par = byId[pid]
        const px = par.x + AVATAR / 2,   py = par.y + AVATAR
        const cx = child.x + AVATAR / 2, cy = child.y
        const mid = (py + cy) / 2
        return {
          key: `${child.id}←${pid}`,
          d: `M ${px} ${py} C ${px} ${mid}, ${cx} ${mid}, ${cx} ${cy}`,
        }
      })
  )
}
