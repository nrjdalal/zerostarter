---
name: fonts
description: Add or swap web fonts by fetching latin variable woff2 files from fontsource and localizing them through next/font/local. Use when changing brand fonts, adding a font role, or debugging font loading, preload, or CLS.
---

# Fonts

Fonts are self-hosted via `next/font/local`. fontsource CSS imports are not used here: they cannot provide metric-adjusted fallback faces (the CLS mechanism, a compiler feature) and add four dependencies for what six vendored files do. The fontsource+turbopack preload approach (upstream ZeroStarter#383) was re-tested 2026-06-06 on Next 16.2.6: prod builds are fixed (preload hashes match the CSS references), but DEV is still broken, the woff2 asset rule rewrites the fontsource CSS urls to unservable node_modules paths and every font 404s locally. Dev breakage alone rules it out, on top of fallback metrics being compiler-only.

## Layout

- `web/next/src/fonts/*.woff2`, vendored latin variable files
- `web/next/src/lib/fonts.ts`, one `localFont` definition per family, each exporting a CSS variable
- `web/next/src/app/layout.tsx`, the variables applied on `<html>`
- `web/next/src/app/globals.css`, theme roles chain to the font variables (`--font-sans: var(--font-dm-sans), sans-serif`)

## Add or swap a font

1. Fetch the latin variable file straight from the fontsource CDN, no dependency needed:

   ```bash
   curl -L -o web/next/src/fonts/<name>-latin-wght-normal.woff2 \
     https://cdn.jsdelivr.net/npm/@fontsource-variable/<name>/files/<name>-latin-wght-normal.woff2
   ```

2. Define it in `src/lib/fonts.ts`: `localFont({ src: "../fonts/<file>", variable: "--font-<name>", weight: "<min> <max>" })`. The weight range is MANDATORY for variable fonts: omitting it defaults the face to 400 and every bold glyph silently becomes faux-bold synthesis. Take the range from the fontsource CSS: `curl -s https://cdn.jsdelivr.net/npm/@fontsource-variable/<name>/index.css | grep font-weight`. Serif fonts also set `adjustFontFallback: "Times New Roman"` (default is Arial metrics)
3. Apply the export's `.variable` on `<html>` in layout.tsx
4. Wire the role in globals.css `@theme inline`: `--font-<role>: var(--font-<name>), <generic>`
5. Verify: dev CSS emits hashed `/_next/static/media/*.woff2` URLs plus generated `"<family> Fallback"` faces; a production build (Vercel preview, protection-bypass header) emits `<link rel="preload" as="font">` for each file
6. Public pages changed → re-run vitals and update the README table per AGENTS.md

## Notes

- DM Sans vendors italics: `src` as an array of `{ path, style }` entries, top-level `weight` covers both. Mono comments render synthetic oblique, chosen.
- Non-variable fonts: fetch the per-weight files and pass `src` as an array with `weight` per entry.
- Removing a font: delete the woff2 + its `localFont` definition + the `<html>` variable + the globals.css role wiring, then grep the variable name to catch stragglers.
