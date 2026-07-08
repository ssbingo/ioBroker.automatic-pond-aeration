# User manual — source & build

This folder holds the **comprehensive user manual** for the `ioBroker.automatic-pond-aeration`
adapter, written for readers **without any prior knowledge** so they can understand and rebuild the
whole project from scratch.

## Files

| File | What it is |
|------|------------|
| `manual.en.typ` | English manual (source) |
| `manual.de.typ` | German manual / Deutsche Ausgabe (source) |
| `template.typ` | Shared modern design/theme (colours, callouts, cover, layout) |
| `assets/` | Diagrams (SVG) embedded in the manual |
| `fonts/` | Bundled DejaVu Sans (so the build is reproducible offline) |
| `pond-aeration-manual.en.pdf` | Built English PDF (committed) |
| `pond-aeration-manual.de.pdf` | Built German PDF (committed) |
| `build.mjs` | Build script — renders both PDFs with [typst](https://typst.app) |

## Build

```bash
cd docs/manual
node build.mjs      # or: npm run build
```

The script downloads the `typst` binary on first run into `.cache/` (git-ignored). typst is a
single, statically-linked binary — **no browser or system libraries required** — which is why it is
used here instead of a headless-Chromium/HTML pipeline.

> **Keep it current:** whenever a feature, option, data point or the hardware changes, update **both**
> `manual.en.typ` and `manual.de.typ` and re-run the build so the committed PDFs stay in sync
> (project rule 23).
