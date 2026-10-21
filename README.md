# Arbol — Family Tree

An interactive family tree built with Vite, React and Tailwind CSS, hosted as a static site on GitHub Pages.

The data lives in a **Google Sheet**. The site reads it live on every visit, so changes appear without redeploying. Family members with a personal **edit code** can edit profiles from the site. Every change is logged and can be reverted from the sheet.

```
GitHub Pages (static site)
      │  GET  members                 ┌─────────── Google Sheet (private) ───────────┐
      ├──────────────────────────────▶│ Apps Script web app (runs as the owner)      │
      │  POST verify / update + code  │   Miembros   — tree data                     │
      └──────────────────────────────▶│   Códigos    — per-person codes (revocable)  │
                                      │   Historial  — every change, with "Revertir" │
                                      └──────────────────────────────────────────────┘
```

---

## Opening the web

> Opening `index.html` directly in the browser will **not** work. The app has to be served by Vite, and it needs `VITE_API_URL` (see the setup below).

Requirements: [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install                      # first time only
cp .env.example .env.local       # then paste your Apps Script URL into it
npm run dev                      # → http://localhost:5173/
```

To open it from your phone on the same network, use `npm run dev -- --host` and the `Network:` URL that Vite prints.

Production build: `npm run build` creates `dist/`, and `npm run preview` serves it at http://localhost:4173/.

---

## One-time setup

### 1. Backend (Google Sheet + Apps Script)

1. Open the spreadsheet → **Extensions → Apps Script**. Replace the contents of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs) and save.
2. Reload the spreadsheet. A new **Árbol** menu appears. Run **Árbol → Preparar hojas** and authorize the script. This creates the `Miembros`, `Códigos` and `Historial` tabs.
3. Fill `Miembros`: open that tab → **File → Import → Upload** the migration CSV → *Replace current sheet*. **Uncheck "Convert text to numbers, dates, and formulas"** so dates like `02/04` stay as typed.
4. **Deploy → New deployment → Web app**. Set *Execute as*: **Me** and *Who has access*: **Anyone**. Copy the `/exec` URL.
5. **Share → General access → Restricted.** The sheet no longer needs to be public, because the web app reads it as you. This keeps the `Códigos` tab private.

> When you change `Code.gs` later, use **Deploy → Manage deployments → ✏️ → Version: New version**. That keeps the same URL. A *New deployment* would create a new URL.

### 2. GitHub Pages

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables → New variable**: `VITE_API_URL` = the `/exec` URL.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the site and publishes it at `https://<user>.github.io/arbol/`.

You only need to redeploy for code changes. Data changes appear on the next page load.

---

## Managing the data

### `Miembros` tab

| Column | Meaning |
|---|---|
| `ID` | Unique, stable id (e.g. `olga-mercedes-peñaloza`). Never change it; other rows reference it. |
| `Primer Nombre`, `Segundo Nombre`, `Apellido` | Name parts |
| `Padre ID`, `Madre ID` | The parent's `ID`. It can point to someone without their own row (e.g. an in-law), in which case it's ignored in the drawing. |
| `Nacimiento`, `Fallecimiento` | Free text (`07/03/1993`, `02/04`, …). The tree shows the year when there is one. |
| `Bio` | Markdown |
| `Foto` | A Google Drive share link. The file must be shared as *Anyone with the link*. Photos uploaded from the site (**Editar → Subir foto**) are saved and shared automatically in the folder set by `PHOTOS_FOLDER_ID` in `Code.gs`. |

Columns are found by header name, so you can reorder them. To add a person, add a row in the sheet.

### Edit codes

- **Create:** **Árbol → Nuevo código de edición…** asks for the person's name and shows a code like `K7QM-3XPA`. Send it to them. On the site they click **Ingresar código** (or **Editar** on a profile).
- **Revoke:** in `Códigos`, uncheck **Activo**. Their next save is rejected and they are logged out.
- `Último uso` shows when each code was last used.

### History and reverting

Every edited field becomes a row in `Historial` with who changed it, the member, the field, and the old and new values. To undo a change, **tick `Revertir`** on that row. The old value is restored and `Estado` shows `Revertido …`.

If the same field was edited again afterwards, the revert is refused with a `Conflicto` message. Revert the newer rows first (from the bottom up).

> Anyone who opens the site can see the tree and photos. Codes only control who can **edit**.

---

## Navigation

| Action         | Desktop        | Mobile          |
|----------------|----------------|-----------------|
| Pan            | Click & drag   | One-finger drag |
| Zoom           | Mouse wheel    | Pinch           |
| View biography | Click portrait | Tap portrait    |
| Edit a profile | **Editar** in the profile | same |

In the biography panel, click a parent, sibling or child to jump to their profile.
