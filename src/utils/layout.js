export const AVATAR  = 80
export const COL_GAP = 200
export const GEN_GAP = 220

// ── Generation (topological) ──────────────────────────────────────────────────
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

// Average x of parents already placed; null if no tree-parents
function preferredX(member, xPos, byId) {
  const ps = (member.parents ?? []).filter(p => byId[p] && xPos[p] !== undefined)
  if (!ps.length) return null
  return ps.reduce((s, p) => s + xPos[p], 0) / ps.length
}

// ── Main layout ───────────────────────────────────────────────────────────────
// Returns members augmented with { x, y } pixel coordinates.
// No manual generation/col needed in the data files — only parents[].
export function computeLayout(members) {
  const byId = Object.fromEntries(members.map(m => [m.id, m]))
  const gen  = computeGenerations(members, byId)

  const byGen = {}
  for (const m of members) {
    const g = gen[m.id]
    if (!byGen[g]) byGen[g] = []
    byGen[g].push(m)
  }

  const maxGen = Math.max(0, ...Object.values(gen))
  const xPos   = {}  // id → fractional column (COL_GAP units)

  for (let g = 0; g <= maxGen; g++) {
    const group = (byGen[g] ?? []).slice()
    if (!group.length) continue

    // Cache preferred x for this pass so centering uses consistent values
    const pref = new Map(group.map(m => [m.id, preferredX(m, xPos, byId)]))

    // Sort: constrained nodes (have parents) by preferred x, then unconstrained by id
    group.sort((a, b) => {
      const ax = pref.get(a.id) ?? Infinity
      const bx = pref.get(b.id) ?? Infinity
      return ax !== bx ? ax - bx : a.id < b.id ? -1 : 1
    })

    // Greedy placement — each node at max(preferred, prev + 1)
    const placed = []
    let nextMin = 0, started = false
    for (const m of group) {
      const p = pref.get(m.id)
      const x = p !== null ? Math.max(p, started ? nextMin : p) : nextMin
      placed.push({ m, x })
      nextMin  = x + 1
      started  = true
    }

    // Centering correction: shift everything so constrained nodes sit on their ideal average
    const constrained = placed.filter(({ m }) => pref.get(m.id) !== null)
    if (constrained.length) {
      const idealAvg  = constrained.reduce((s, { m }) => s + pref.get(m.id), 0) / constrained.length
      const actualAvg = constrained.reduce((s, { x }) => s + x, 0) / constrained.length
      const shift = idealAvg - actualAvg
      for (const p of placed) p.x += shift
    }

    for (const { m, x } of placed) xPos[m.id] = x
  }

  // Shift so leftmost node starts at x = 0
  const minX = Math.min(0, ...Object.values(xPos))

  return members.map(m => ({
    ...m,
    x: ((xPos[m.id] ?? 0) - minX) * COL_GAP,
    y: (gen[m.id] ?? 0) * GEN_GAP,
  }))
}

// ── Lines ─────────────────────────────────────────────────────────────────────
// One cubic bezier per parent→child pair.
export function buildLines(positioned) {
  const byId = Object.fromEntries(positioned.map(m => [m.id, m]))
  return positioned.flatMap(child =>
    (child.parents ?? [])
      .filter(pid => byId[pid])
      .map(pid => {
        const par = byId[pid]
        const px = par.x + AVATAR / 2,  py = par.y + AVATAR
        const cx = child.x + AVATAR / 2, cy = child.y
        const mid = (py + cy) / 2
        return {
          key: `${child.id}←${pid}`,
          d: `M ${px} ${py} C ${px} ${mid}, ${cx} ${mid}, ${cx} ${cy}`,
        }
      })
  )
}
