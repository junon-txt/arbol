# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server
npm run build    # production build → dist/
npm run preview  # preview the build
```

## Stack

Vite + React 18 + Tailwind CSS v3 (`@tailwindcss/typography` for prose). No router — single-page with state-driven modal.

## Architecture

**Data pipeline**: `src/assets/members/*/profile.md` → `familyData.js` → `layout.js` → React components.

### Member files (`src/assets/members/<slug>/profile.md`)

Required frontmatter fields only:

```yaml
---
id: short-id          # referenced in other files' parents arrays
name: Full Name
born: 1950            # number
died: 2020            # number, omit if living
parents: [id1, id2]   # IDs of parents present in the tree; [] for roots
---

Bio text here (markdown).
```

Drop a `photo.jpg` (or `.png`/`.webp`) alongside `profile.md` to use a real photo; otherwise an auto-generated gradient avatar is shown.

### `src/utils/familyData.js`

Uses `import.meta.glob` with `{ as: 'raw', eager: true }` to load all `.md` files and images at build time. Parses frontmatter with a small inline parser (no external dep). Images are resolved by matching filename against the member's directory.

### `src/utils/layout.js`

`computeLayout(members)` auto-computes positions from parent relationships:
1. **Generations** — topological sort: `gen[id] = max(gen[parent]) + 1`, roots at 0.
2. **X positions** — tier by tier: each node placed at the average x of its parents (greedy, min-spacing 1 unit), then a centering correction shifts the whole tier so constrained nodes sit on their ideal average. Unconstrained nodes (no tree-parents) are placed right of constrained ones.

`buildLines(positioned)` emits one cubic bezier per parent→child pair (parent circle bottom → child circle top).

### Components

- `TreeView` — pan/zoom canvas (pointer + wheel + touch). Renders SVG line layer beneath absolutely-positioned `PersonNode`s.
- `PersonNode` — circular avatar (photo or gradient+initials) + name + years. `data-person` attr prevents drag from firing on click.
- `ProfileModal` — bottom-sheet on mobile, centered card on desktop. Cover strip, overlapping avatar, markdown bio via `marked`, family mini-avatars (parents / siblings / children) that navigate to each other.
- `App` — owns `selected` state; wires tree ↔ modal.
