# web/next vs web/start: benchmark + audit

Comparison of the Next.js App Router app (`web/next`) against its TanStack Start port (`web/start`), on branch `web/start-migrated`. Both built and served against the same Hono API (`:4000`); measurements on the same machine with dev servers stopped.

## Headline

The port is faster to build (~2x), far leaner (3-4x smaller artifacts), and ships ~half the SSR HTML, at full parity. The initial dev-only verification (golden suite 130/131, visual 99.92%) hid a class of production-bundle failures: four wasm/CJS-interop bugs in the Nitro server bundle that dev never surfaces. **All four are now fixed.** Production serves every route (pages, content, server routes, OG PNGs, auth gating), dev is 131/131 with the fixes applied, and the remaining prod golden-suite failures are the dev-only agent-login harness (below), not app bugs. Production is releasable.

## Benchmarks

### Build performance (shared packages pre-built, cache warm)

| metric                | web/next                | web/start                 | delta                                                      |
| --------------------- | ----------------------- | ------------------------- | ---------------------------------------------------------- |
| build wall-time       | 12.44s                  | 6.06s                     | **web/start ~2x faster** (Vite/Rolldown vs Next+Turbopack) |
| total build output    | 143 MB (`.next`)        | 31 MB (`.output`)         | web/start ~4.6x smaller                                    |
| server bundle         | 80 MB (`standalone`)    | 27 MB (`.output/server`)  | web/start ~3x smaller                                      |
| client static         | 3.8 MB (`.next/static`) | 3.9 MB (`.output/public`) | ~equal (same React app + deps)                             |
| client JS, all chunks | 3216 KB                 | 3112 KB                   | ~equal                                                     |

### Runtime (production servers, median of 20 requests)

TTFB is document time-to-first-byte; all values are localhost, so absolute differences of 1-4ms are dominated by process overhead, not meaningful user-facing latency.

| page                        | next TTFB | start TTFB | next HTML | start HTML | HTML reduction |
| --------------------------- | --------- | ---------- | --------- | ---------- | -------------- |
| /hire                       | 1.8ms     | 2.8ms      | 67.7 KB   | 30.1 KB    | -56%           |
| /resume                     | 1.7ms     | 2.6ms      | 65.0 KB   | 28.0 KB    | -57%           |
| /waitlist                   | 1.6ms     | 2.6ms      | 34.3 KB   | 18.5 KB    | -46%           |
| /docs                       | 2.0ms     | 4.3ms      | 109.8 KB  | 72.9 KB    | -34%           |
| /docs/getting-started/setup | 1.9ms     | 4.2ms      | 135.6 KB  | 87.5 KB    | -35%           |
| /blog                       | 1.6ms     | 2.6ms      | 44.2 KB   | 21.3 KB    | -52%           |
| /blog/web-development-2026  | 1.8ms     | 3.3ms      | 82.6 KB   | 44.0 KB    | -47%           |
| /robots.txt                 | 1.4ms     | 0.5ms      | -         | -          | -              |
| /sitemap.xml                | 1.4ms     | 0.6ms      | 5.1 KB    | 5.1 KB     | identical      |
| /llms.txt                   | 1.6ms     | 0.6ms      | 4.1 KB    | 4.1 KB     | identical      |

Takeaways:

- **web/start ships ~35-57% less SSR HTML per page.** Next inlines a large RSC flight payload into the document; TanStack Start's serialized router state is much smaller. This is the most material runtime win.
- **Raw server routes are ~2-3x faster on web/start** (Nitro handler vs Next route handler): robots/sitemap/llms at 0.5-0.6ms vs 1.4-1.6ms.
- **SSR page TTFB is slightly higher on web/start** (~1-2ms), consistently but negligibly.
- Initial JS requests for /hire: 21 (next) vs 16 (start). Per-page transferred JS bytes were not cleanly comparable because the bare Next standalone server 404s `.next/static` (Vercel serves those separately in a real deploy).

## Parity audit

- **Golden suite** (`tests/`, 131 black-box tests, unchanged): 130/131 against web/start. The one failure is the sign-out load-flake that also affects web/next and passes in isolation. **Caveat: run against the dev server.**
- **Visual regression** (37 pages, pixelmatch vs web/next baseline): mean 99.919%, 4 pixel-exact, 30 at >=99%, 3 at 98.9-99.8% (1px full-page-height rounding). **Caveat: dev server.**

## Production-readiness audit (resolved)

Dev (Vite on-demand SSR transforms) masks bundling problems that only appear in the Nitro production bundle. Four found, all fixed:

1. **tslib CJS interop** - Base UI's scroll-lock deps (`react-remove-scroll-bar`, `react-style-singleton`, `use-sidecar`) and orama `require("tslib")`; Rolldown's CJS interop resolves `.default` to null, and every response 500s with `Cannot destructure property '__extends'`. **Fixed:** alias `tslib` to its pure-ESM build in `vite.config.ts`.
2. **query-devtools SSR `window`** - `@tanstack/react-query-devtools` (solid-js) calls `delegateEvents(..., window.document)` at module load; web/next's devtools were a `"use client"` component that never SSR'd, but Start has no RSC so it ran on the server. Gate was on the runtime `VITE_NODE_ENV` (baked as `local` at build time), so it rendered. **Fixed:** gate on `import.meta.env.DEV` so Rolldown tree-shakes it out of prod entirely.
3. **takumi/OG wasm bundled into the shared shiki chunk** - `takumi-js` (OG rendering) works in the `/og/*` server routes (native `@takumi-rs/core` binding), but Rolldown bundled its wasm-bindgen fallback and merged it into the shared `_libs/shiki.mjs` chunk; that module self-initializes wasm at import and 500s the landing (which imports shiki), while hire/docs (no shiki) were unaffected. `import ./takumi_wasm_bg.js:__wbg___wbindgen_is_object... must be an object`. **Fixed:** `nitro({ rollupConfig: { external: [/^(takumi-js|@takumi-rs\/)/] } })` keeps takumi external so it loads from node_modules at runtime and picks the native binding. (`ssr.external` and Nitro `externals` did not reach the server rollup; `rollupConfig.external` did.)
4. **shiki oniguruma wasm** - once takumi was externalized the landing served, but silently rendered no highlighting: `codeToHtml`'s default oniguruma engine needs a wasm binary the Nitro bundle does not emit, and it fails quietly. **Fixed:** build a `createHighlighter` with shiki's wasm-free JS regex engine (`createJavaScriptRegexEngine`), reused across requests. (The `engine` option is not valid on the `codeToHtml` shortcut; `createHighlighter` takes it type-safely.)

All four fixes live in `vite.config.ts`, `providers.tsx`, and `(marketing)/index.tsx`; `og-image.tsx` stays identical to web/next (the externalization does the work). `tsc` is clean. Every route serves in production, OG routes emit real PNGs, and the golden suite is 131/131 against dev.

## Architecture / behavior differences

- **Metadata**: Next's `metadata` export auto-derives `og:title`/`og:image`; Start's route `head()` has no title template, so each title and `og:title` is composed inline.
- **Env**: Next inlines `NEXT_PUBLIC_*` at build; Start inlines `VITE_*`. Build-mode gating must use `import.meta.env.DEV/PROD`, not a runtime env var (see finding 2).
- **notFound()**: Next's throws; Start's returns a value that must be thrown, and raw server handlers return a 404 `Response` instead.
- **Server routes**: Next route handlers vs Nitro `server.handlers`; the `.md`/`.txt` rewrites need both a built-server rewrite and a dev-middleware mirror (Vite 404s extension-ful paths first).

## Verdict

The port is a real improvement on build speed (2x), artifact size (3-4x), and SSR payload (~half), at no meaningful TTFB cost and at full parity. All four production-bundle bugs are fixed; production now serves every route including OG PNGs and auth gating, and dev is 131/131. Recommend adding a production smoke test to CI (build, boot, curl the landing + an OG route) so the dev/prod verification gap that hid these bugs cannot recur.

## Prod golden-suite note

Against the production build the suite is 125/132; the 7 failures are all auth flows (agent login, console, dashboard org switcher). They fail because the local-only "Login (agents)" affordance is gated `process.env.NODE_ENV === "development"` (identical to web/next) and is correctly absent from a production build, so the harness cannot authenticate. Authenticated routes themselves work in production (verified: `/dashboard` and `/console` return 200 with a session cookie, 307/404 without). The suite is designed to run against the dev server.
