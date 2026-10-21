# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server
npm run build    # production build → dist/
npm run preview  # preview the build
```

Requires `VITE_API_URL` in `.env.local` (see `.env.example`).

## Stack

Vite + React 18 + Tailwind CSS v3 (`@tailwindcss/typography` for prose). No router — single-page with state-driven modal.

## Architecture

**Data pipeline**: Google Sheet `Miembros` tab → Apps Script web app (`apps-script/Code.gs`, `doGet`) → `src/utils/api.js` (`fetchMembers`, at runtime) → `familyData.js` (`toMember`) → `layout.js` → React components. No member data is bundled; the static site needs `VITE_API_URL` (the Apps Script `/exec` URL; `.env.local` locally, a repo variable in `.github/workflows/deploy.yml`).

### Backend (`apps-script/Code.gs`)

Bound to the spreadsheet, deployed as a web app ("Execute as: Me", "Anyone"); the sheet itself is private. Columns are looked up by header name (`FIELDS` maps API keys ↔ headers).
- `doGet` → `{ ok, members: [{ id, firstName, middleName, lastName, fatherId, motherId, born, died, bio, photo }] }`
- `doPost` body `{ action: 'verify' | 'update' | 'upload', code, ... }`. `upload` (`{ id, mimeType, data: base64 }`) stores the image in `PHOTOS_FOLDER_ID`, shares it view-only and returns its link; the client then saves that link via `update` so it lands in `Historial`. The client resizes to ≤1200px JPEG first (`api.js` `resizeToJpeg`). Codes come from the `Códigos` tab (`Activo` checkbox revokes). Each changed field is appended to `Historial`; ticking `Revertir` there runs the `onEdit` simple trigger, which restores the old value unless the field changed again since.
- Values are written with a leading `'` so Sheets keeps dates as typed text.
- Client POSTs use `Content-Type: text/plain` to avoid a CORS preflight.

### `src/utils/familyData.js`

`toMember(raw)` derives `name`, `parents` (`[fatherId, motherId]`), `photo` (Drive link → `lh3.googleusercontent.com/d/<id>` URL) and keeps the raw link as `photoLink`. Parent IDs without their own row are allowed and skipped by the layout.

### `src/utils/layout.js`

`computeLayout(members)` auto-computes positions via two passes:
1. **Pass 1 — subtree widths (bottom-up)**: each child is assigned to its first listed parent (*primary parent*). A node's `width` = number of leaf-slots its owned subtree occupies (leaves = 1, internal = sum of children widths). This gives every ancestor a horizontal reservation proportional to its descendants.
2. **Pass 2 — x positions (top-down, per generation)**: nodes are sorted by average parent x, then placed greedily — each node occupies a block of `width` slot-units, starting at `max(preferred_x, prev_right_edge + w/2)`. A centering correction then shifts the whole tier so constrained nodes land on their ideal average. Unconstrained roots are placed sequentially by id.

This guarantees no horizontal overlap regardless of tree depth, and arrows never skew sideways.

`buildLines(positioned)` emits one cubic bezier per parent→child pair (parent circle bottom → child circle top).

### Components

- `TreeView` — pan/zoom canvas (pointer + wheel + touch). Renders SVG line layer beneath absolutely-positioned `PersonNode`s.
- `PersonNode` — circular avatar (photo or gradient+initials) + name + years. `data-person` attr prevents drag from firing on click.
- `ProfileModal` — bottom-sheet on mobile, centered card on desktop. Cover strip, overlapping avatar, markdown bio via `marked`, family mini-avatars (parents / siblings / children) that navigate to each other. **Editar** swaps the body for `EditForm`.
- `EditForm` — edits a member; sends only changed fields.
- `CodeDialog` — asks for and verifies an edit code.
- `App` — loads members, owns `selected` and the edit session (`{ code, editor }` in `localStorage`), wires tree ↔ modal ↔ API.
