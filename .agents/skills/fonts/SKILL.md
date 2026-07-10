---
name: fonts
description: Add, swap, or remove a self-hosted web font (latin variable woff2 from fontsource, localized via next/font/local). Use when adding a font role, or debugging font loading, preload, or CLS.
---

# Fonts

Fonts are self-hosted through `next/font/local`, which generates the metric-adjusted `"<family> Fallback"` faces that hold CLS near zero. Do NOT switch to fontsource CSS imports: the bundler resolves their `url()` references to `node_modules` paths that 404 in dev, and they cannot emit the compiler-only fallback metrics.

## Layout

- `web/next/src/fonts/*.woff2`, vendored latin variable files
- `web/next/src/lib/fonts.ts`, one `localFont` per family, each exporting a CSS variable
- `web/next/src/app/layout.tsx`, the variables applied on `<html>`
- `web/next/src/app/globals.css` `@theme inline`, roles chain to the font variables (`--font-sans: var(--font-dm-sans), sans-serif`)

## Add or swap a font

1. Fetch the latin variable file straight from the fontsource CDN, no dependency needed:

   ```bash
   curl -L -o web/next/src/fonts/<name>-latin-wght-normal.woff2 \
     https://cdn.jsdelivr.net/npm/@fontsource-variable/<name>/files/<name>-latin-wght-normal.woff2
   ```

2. Define it in `web/next/src/lib/fonts.ts`: `localFont({ src: "../fonts/<file>", variable: "--font-<name>", weight: "<min> <max>" })`. The weight range is MANDATORY for variable fonts: omit it and the face defaults to 400, so every bold glyph becomes faux-bold synthesis. Read the range from the fontsource CSS: `curl -s https://cdn.jsdelivr.net/npm/@fontsource-variable/<name>/index.css | grep font-weight`. A serif also sets `adjustFontFallback: "Times New Roman"` (the default fallback metrics are Arial).
3. Apply the export's `.variable` on `<html>` in `layout.tsx`.
4. Wire the role in `globals.css` `@theme inline`: `--font-<role>: var(--font-<name>), <generic>`.
5. Verify loading: dev CSS emits hashed `/_next/static/media/*.woff2` urls plus generated `"<family> Fallback"` faces, and a production build (Vercel preview, protection-bypass header) emits one `<link rel="preload" as="font">` per file. No font 404s.
6. If a public page changed, check CLS and LCP for layout shift before shipping.

## Notes

- Scoped preload: any font declared in `web/next/src/lib/fonts.ts` preloads on every page, because the root layout imports it. To scope a font's preload to specific routes, declare it in a module only those routes import: author-only fonts live in `web/next/src/lib/marketing/fonts.ts` with woff2 under `web/next/src/fonts/marketing/`.
- DM Sans vendors italics: `src` is an array of `{ path, style }` entries and one top-level `weight` covers both. Mono renders synthetic oblique for italics, chosen.
- Non-variable font: fetch the per-weight files and pass `src` as an array with a `weight` per entry.
- Remove a font: delete the woff2, its `localFont` definition, the `<html>` variable, and the `globals.css` role, then grep the variable name to catch stragglers.
