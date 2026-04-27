# Family Chronicle — Static Family Tree

A beautiful, interactive family tree that runs entirely in the browser.
No server required. Just open `index.html`.

---

## Adding Your Family Members

Edit the `FAMILY` array inside `index.html`. Each person looks like this:

```js
{
  id: "p1",                          // unique id (any string)
  name: "Thomas Thornton",
  years: "1948 – 2019",              // birth/death years (optional)
  bio: "A short paragraph about this person.",

  // ── Photo ──────────────────────────────────────────────────────────────
  image: "photos/thomas.jpg",        // path relative to index.html, or null
  bbox: [120, 45, 280, 280],         // [x, y, width, height] crop in pixels
                                     // within the source image. null = use whole image.

  // ── Tree position ───────────────────────────────────────────────────────
  generation: 2,                     // 0 = oldest ancestors, increases downward
  col: 0,                            // column index within this generation (0, 1, 2 …)
  parents: ["gp1", "gp2"],           // IDs of up to two parents (empty array = root)
}
```

### Photo bounding box (`bbox`)

`bbox` lets you point at one region of a large group photo or scanned picture.

1. Open the photo in any image viewer that shows pixel coordinates (e.g. Preview on Mac, Paint on Windows, or browser DevTools).
2. Note the **top-left corner** `(x, y)` of the face/crop you want, and the **width** and **height** of the rectangle.
3. Set `bbox: [x, y, width, height]`.

The app will crop that region for the circular portrait thumbnail and the full-width header in the modal.

If `bbox` is `null` the whole image is used.

### Folder structure (recommended)

```
index.html
photos/
  thornton-family-1952.jpg   ← one big group photo
  eleanor.jpg
  thomas.jpg
  camille.jpg
  …
```

You can also use one image per person or any mix.

---

## Navigation

| Action | Desktop | Mobile |
|--------|---------|--------|
| Pan | Click & drag | One-finger drag |
| Zoom | Mouse wheel | Pinch |
| Reset view | ⌂ button | ⌂ button |
| View biography | Click portrait | Tap portrait |

---

## Customising the Title

Change `"Family Chronicle"` in the `<h1>` tag inside the `#topbar` div.

---

## Hosting

Because it's a single HTML file with no build step, you can:
- Open it locally in any browser
- Drop it (and your `photos/` folder) into any static host: GitHub Pages, Netlify Drop, Cloudflare Pages, etc.
