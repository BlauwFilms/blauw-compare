# Blauw Films — Rich Text Before/After Compare Slider

A minimalist before/after image slider for Webflow rich-text fields. Built for the **Blauw Films Art Gallery** to let visitors drag between paired images — ideal for clay-render vs. final-render comparisons, viewport vs. final, lighting passes, and other side-by-side reveals.

Designed to coexist with [blauw-zoom](https://github.com/BlauwFilms/blauw-zoom): slider images are never zoomable, and no modification to `zoom.js` is required.

---

## Features

| Feature | Detail |
| --- | --- |
| **Alt-text pairing** | Tag any two images with `compare:groupId:before` and `compare:groupId:after` to pair them |
| **Drag, click, touch** | Drag the divider, or click anywhere on the image to jump the divider there |
| **Keyboard accessible** | `Tab` to focus the divider, arrow keys to move (hold `Shift` for larger steps), `Home`/`End` for edges |
| **Minimalist handle** | Small 14×28 px rectangle, `#1a1a1a` fill with a 1 px `#dadada` border, centered on a 50% grey divider line |
| **Alignment preserved** | Keeps Webflow's `w-richtext-align-*` classes and inline styles from the original image block |
| **Zoom-safe** | Uses `pointer-events: none` on slider images so Blauw Zoom's click listeners never fire on them |
| **Dynamic content** | `MutationObserver` picks up images injected after initial load (CMS, tabs, etc.) |
| **Accessibility preserved** | Remaining alt-text after the tag is kept on the rendered image; divider announces `role="slider"` with live `aria-valuenow` |

---

## File Structure

```
/
├── css/
│   └── compare.css     ← Stylesheet
├── js/
│   └── compare.js      ← Script
└── README.md
```

---

## Deployment to GitHub Pages

1. Push this folder to the `main` branch of a public GitHub repo (e.g. `blauw-compare`).
2. **Settings → Pages → Deploy from a branch → main → / (root)**.
3. Files will be live at:

```
https://blauwfilms.github.io/blauw-compare/css/compare.css
https://blauwfilms.github.io/blauw-compare/js/compare.js
```

---

## Webflow Integration

### 1. Add to `<head>` (Site Settings → Custom Code → Head)

```html
<link rel="stylesheet" href="https://blauwfilms.github.io/blauw-compare/css/compare.css">
```

### 2. Add before `</body>` (Site Settings → Custom Code → Footer)

```html
<script src="https://blauwfilms.github.io/blauw-compare/js/compare.js"></script>
```

Load order relative to `zoom.js` does not matter — the two scripts are independent.

---

## Authoring in Webflow

Inside any Rich Text element in the CMS (or static Rich Text block):

1. Upload your **before** image. In the image settings, set the **Alt text** to:
   ```
   compare:forestScene:before Clay render of the forest at sunrise
   ```
2. Upload your **after** image. Set its **Alt text** to:
   ```
   compare:forestScene:after Final render of the forest at sunrise
   ```
3. That's it. On the published page, the two images collapse into a single slider.

**Rules**

- `groupId` (the middle token) is your own identifier — use any short slug without spaces or colons. It must match exactly between the two images.
- Everything after the `:before` / `:after` token and a space becomes the real alt text for accessibility.
- Place the two images anywhere in the Rich Text block. They don't need to be adjacent.
- Both images must be the same aspect ratio for the slide to track correctly.
- One `groupId` per pair. If you want multiple sliders in the same article, use distinct IDs: `compare:scene01:before`, `compare:scene02:before`, etc.

---

## Configuration

Tunable values sit in the `CFG` object at the top of `compare.js`:

```js
var CFG = {
  RICH_TEXT_SEL: ".w-richtext, .rich-text, [class*='rich-text']",
  ALT_PREFIX:    "compare:",
  START_POS:     50,     // initial divider position (%)
  KEY_STEP:      2,      // arrow-key step (%)
  KEY_STEP_BIG:  10      // shift + arrow-key step (%)
};
```

Visual tweaks (line colour, handle size/colour, focus ring) live in `compare.css` alongside the relevant selectors.

---

## How It Works

1. On page load, the script queries every rich-text container for `<img>` tags whose alt attribute begins with `compare:`.
2. Images are grouped by the middle token in their alt text. Complete pairs (one `before`, one `after`) are processed; incomplete groups are skipped with a console warning.
3. For each pair, the script locates the outermost block that contains each image within the rich-text container (typically Webflow's `<figure>` wrapper), replaces the "before" block with a `.bf-compare` element, and removes the "after" block.
4. The `.bf-compare` element contains two real `<img>` tags and a thin divider with a handle. CSS `pointer-events: none` on those images means any click listener Blauw Zoom attaches to them never fires — clicks and drags go to the wrapper instead.
5. Pointer Events (unified mouse/touch/pen) drive the drag and click-to-jump behaviour. The divider is a focusable element with `role="slider"`, supporting arrow-key navigation.
6. A `MutationObserver` re-runs the scan when new rich-text images are injected (CMS pagination, tab reveals, etc.).

---

## Accessibility Notes

- The divider exposes `role="slider"` with live `aria-valuenow` updates on every change, so screen readers announce the position.
- The wrapper uses `role="region"` with an `aria-label` so the whole slider is described in the page structure.
- Keyboard users can focus the divider with `Tab` and adjust it without a mouse.
- The remaining alt text after the tag is kept as the real `alt` attribute on each rendered image.

---

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). Uses Pointer Events, `clip-path`, and `:focus-visible` — no polyfills required. Vanilla JS, no dependencies.

---

## License

MIT — free to use and modify for Blauw Films and beyond.
