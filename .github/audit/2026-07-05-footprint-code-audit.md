# web/next footprint + code audit (post-cutover)

Audit of the TanStack Start app after the Next.js retirement, for dead code, minimal footprint, and correctness. Tooling: `oxlint`, `knip` (configured with TanStack route entries, since it treats file-based routes as unreachable otherwise), plus manual cross-package verification.

## Removed (dead code)

- **`generatePublicBlogParams`** (`lib/blog.ts`) - a port of Next's `generateStaticParams`; TanStack has no such hook, so it was never called. Removed.
- **`assertConsoleAccess`** (`lib/auth/console.ts`) - superseded during the migration by `getConsoleSession` (the console routes gate via `getConsoleContext`/`getConsoleSession`). The only remaining reference was a comment. Removed, along with its now-unused `notFound` import.

## De-exported (used internally, over-exported)

- **`isBlogIndexPage`** (`lib/blog.ts`) and **`renderOgElement`** (`lib/og-image.tsx`) - each is only used within its own module; dropped the `export`.

## Fixed (did not work out of the box)

- **Error / loading / 404 boundaries were unwired.** Next auto-wires `error.tsx`, `loading.tsx`, and `not-found.tsx`; the migration ported `RouteError` and `RouteLoading` as components but never attached them, so they were dead code AND the app fell back to TanStack's unstyled defaults (with the runtime warning "a notFoundComponent option was not configured"). Wired `defaultErrorComponent`/`defaultPendingComponent`/`defaultNotFoundComponent` in `router.tsx`, and added the missing `RouteNotFound` (`components/route/not-found.tsx`). An unknown route now returns 404 with the styled "Page not found / Go home" page; the warning is gone.

## Cleaned

- **13 files' migration comments** referenced "web/next's X" or "in web/next" to mean the _old_ Next app - now self-referential and pointing at deleted files. Rewritten to "the Next.js app". Real path references (`web/next/docs.config.ts`, the landing's `CodeWindow` label) were left intact.

## Kept intentionally (flagged by knip, NOT dead)

- **~44 unused `src/components/ui/*` shadcn primitives** (accordion, calendar, carousel, chart, command, drawer, ...) and their sub-exports (`badgeVariants`, `AvatarBadge`, ...) and deps (`cmdk`, `recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`). `bun run shadcn:update` regenerates the **whole** registry surface by design - the `shadcn-sync` skill explicitly names "unused ones like calendar.tsx". Removing them would be reverted by the next sync and would shrink the fork-ready component set. Left as-is.
- **`dashboardShellVariants`** (cva export) and the **`ApiError`** client type - conventional public surface (like `buttonVariants`); harmless, left.

## Code quality

Clean: **0** `as any`, **0** empty catches, **0** lint-disables, `oxlint` passes. The single `@ts-expect-error` (`api/$.ts`) is legitimate and documented - undici requires `duplex` for streamed request bodies, absent from the standard `RequestInit` type.

One acceptable note: the `.md`/`.txt` rewrite pattern appears in two forms - `MD_ALIAS` in `src/server.ts` (matches `url.pathname`, built server) and the dev-middleware regex in `vite.config.ts` (matches raw `req.url` including the query string). They are context-specific, not a copy; the divergence (query handling) is intrinsic, and sharing them would couple the Vite config to the server entry for marginal benefit. Documented in place.

## Verification

`tsc --noEmit` 0 errors, `web/next` production build succeeds, golden suite 130/131 (the one failure is the pre-existing sign-out load-flake that also predates the migration and passes in isolation), styled 404 confirmed at runtime. Dependency hygiene was already handled in the cutover (removed `@t3-oss/env-core`, `vaul`, and catalog leftovers `next` + `@tailwindcss/postcss`).

## Verdict

Footprint is minimal. The only genuine dead code was two migration leftovers (now removed) and two over-exports (now internal); the large "unused" surface knip reports is the intentional shadcn library. The one real defect was the unwired error/404/loading boundaries, now fixed - the app works out of the box.
