# Next.js 16.3 adoption

- Status: backlog
- Links: PR #786 (`agentRules: false`); #783 (the 16.3 bump); #784 (web functions on Node)

`canary` runs `next@^16.3.0`, so the zero-config wins are already banked: lower dev memory, cached repeat builds, faster server rendering, fewer prefetch requests. This records what was assessed on top of that, and what was decided, so none of it gets re-litigated from the blog post alone.

## Adopted

**`agentRules: false`** (PR #786). Since 16.3, `next dev` upserts a managed agent-rules block, and creates `AGENTS.md` plus a `CLAUDE.md` holding `@AGENTS.md` when neither exists. `next dev` runs in `web/next/`, where neither exists, so it would create a second unmanaged pair beside the generated, symlinked root pair. Verified by calling the writer against an empty directory shaped like `web/next`: `{"agentsMd":"created","claudeMd":"created"}`.

## Measured and declined

**`experimental.turbopackRustReactCompiler`.** The React Compiler runs inside Turbopack instead of through Babel. The release claims 34% cold and 46% warm off `next dev` time-to-ready on a large app.

Measured here as cold `.next` to first `/console/users` render, three runs per arm, same warm turbo cache so package builds could not skew it:

| Arm   | Runs (ms)        | Mean     |
| ----- | ---------------- | -------- |
| Rust  | 5544, 5125, 4821 | **5163** |
| Babel | 5653, 5435, 5453 | **5514** |

About 6%, consistently in the Rust arm's favour but nowhere near the claimed figures, and the ranges overlap. Next reports the key as valid (`✓ turbopackRustReactCompiler`), so this is a real measurement, not a rejected flag.

Declined because the gain does not carry an experimental flag in a starter: every fork inherits `next.config.ts`, and the repo already avoids `unstable_`-grade APIs for that reason. Revisit when the Rust path leaves experimental, or if a later release makes the gap material here.

A first measurement showed a 60% improvement and was wrong: the baseline arm built the workspace packages cold while the second read them from the turbo cache. Warm the cache in both arms before trusting any number from this.

## Spiked and declined for now: Instant Navigations

**`cacheComponents` + `partialPrefetching`.** The headline feature, and the console tables are the case it is built for. Spiked by flipping `cacheComponents: true` in a throwaway worktree and curling every route against a live dev server, rather than reasoning from the blog post.

Dev boots clean (`- Cache Components enabled`, `✓ Ready in 326ms`), then **10 of 14 routes answer 500**. Only the marketing pages (`/`, `/hire`, `/resume`, `/waitlist`) survive the first request; `/blog`, `/docs`, `/dashboard` and the whole console fail. Two distinct causes, both hard errors, not warnings:

```
Error: Route segment config "dynamic" is not compatible with `nextConfig.cacheComponents`. Please remove it.
Error: Route segment config "revalidate" is not compatible with `nextConfig.cacheComponents`. Please remove it.
Error: Route "/": Next.js encountered the unstable value `Date.now()` while prerendering.
```

**Blocker 1: 15 route-segment exports across 10 files.** Every one has to be deleted and its behaviour re-expressed as `use cache` with a `cacheLife` profile, which is a per-route caching decision, not a mechanical rename.

| File                                           | Exports                    |
| ---------------------------------------------- | -------------------------- |
| `app/(console)/console/layout.tsx`             | `dynamic` (the admin gate) |
| `app/(content)/blog/[[...slug]]/page.tsx`      | `dynamic`, `revalidate`    |
| `app/(llms.txt)/llms-full.txt/route.ts`        | `dynamic`, `revalidate`    |
| `app/(llms.txt)/llms.txt/[[...slug]]/route.ts` | `dynamic`, `revalidate`    |
| `app/api/console/search/route.ts`              | `dynamic`                  |
| `app/og/blog/[[...slug]]/route.tsx`            | `dynamic`, `revalidate`    |
| `app/og/docs/[[...slug]]/route.tsx`            | `dynamic`                  |
| `app/og/home/route.tsx`                        | `dynamic`                  |
| `app/og/route.tsx`                             | `dynamic`                  |
| `app/sitemap.ts`                               | `dynamic`, `revalidate`    |

**Blocker 2: three `Date.now()` calls that are deliberate.** `app/layout.tsx` (twice) and `lib/fumadocs.tsx` append `?t=${Date.now()}` to OG image URLs as a cache-buster. Under `cacheComponents` an unstable value read during prerender is an error, so the buster has to go or move behind a cached boundary, and losing it means stale OG images. That is a real trade to argue, not a lint fix.

**Blocker 3: the shape the app does not have.** 0 `<Suspense>` boundaries, 0 `use cache`, 2 `loading.tsx`. The payoff is a prerendered shell streaming into dynamic holes, so every dynamic route needs a shell designed for it. Nothing to migrate; something to design.

**Blocker 4: the two authed surfaces, which are the ones worth speeding up.** Both `(console)` and `(protected)` block on `getConsoleSession()` / the session read, which runs `disableCookieCache: true`, deliberately, so a ban or a role change takes effect on the next request rather than up to five minutes later. An App Shell can only be prerendered above that read, so getting the session into the shell means accepting `stale >= 5 minutes` and giving that property up. Separately, moving `assertConsoleAccess()` under `<Suspense>` turns its real 404 into a soft 200, which widens the bug already recorded in [console-notfound-status](console-notfound-status.md) instead of leaving it where it is.

Declined for now on that basis: it is a project with a caching design per route and two policy decisions attached (OG freshness, session staleness), not a config flag. Revisit as its own plan entry, and start from blockers 1 and 2, which are mechanical enough to land ahead of any shell work.

## Assessed, not pursued

- **`catchError` custom error boundaries** - see [console-notfound-status](console-notfound-status.md); spiked against the soft-404 and it does not fix it.
- **Root params** (`next/root-params`) - no `[lang]` segment, no i18n.
- **Playwright `instant()` helper** - UI here is verified with agent-browser, not Playwright.
- **`experimental.useOffline`** - no offline requirement.
- **`import.meta.glob`** - fumadocs already owns MDX loading.
- **Immutable static assets** - adapter-level; belongs with the Vercel deploy work.

## Resolved by the upgrade

`next build` type-checks under TypeScript 7 again, so the `catalog:next` TS 6 pin from #724 is gone (removed in #783) and must not come back. On 16.2 the build logged `Detected @typescript/native-preview ... requires the standard typescript package` and finished its check in 85ms, checking nothing. On 16.3 there is no warning, the check takes ~1.3s, and an injected `const x: number = "str"` fails the build with `TS2322`. Re-verify that way rather than by reading timings: the old failure mode was silence.
