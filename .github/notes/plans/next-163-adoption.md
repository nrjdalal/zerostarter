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

## Assessed, not pursued

- **Instant Navigations** (`cacheComponents` + `partialPrefetching`) - the console tables are the ideal case, but the app has 0 `<Suspense>` boundaries and 0 `use cache`, so adopting it means designing a loading shell per dynamic route. Its own project, with its own entry when it starts.
- **`catchError` custom error boundaries** - see [console-notfound-status](console-notfound-status.md); spiked against the soft-404 and it does not fix it.
- **Root params** (`next/root-params`) - no `[lang]` segment, no i18n.
- **Playwright `instant()` helper** - UI here is verified with agent-browser, not Playwright.
- **`experimental.useOffline`** - no offline requirement.
- **`import.meta.glob`** - fumadocs already owns MDX loading.
- **Immutable static assets** - adapter-level; belongs with the Vercel deploy work.

## Resolved by the upgrade

`next build` type-checks under TypeScript 7 again, so the `catalog:next` TS 6 pin from #724 is gone (removed in #783) and must not come back. On 16.2 the build logged `Detected @typescript/native-preview ... requires the standard typescript package` and finished its check in 85ms, checking nothing. On 16.3 there is no warning, the check takes ~1.3s, and an injected `const x: number = "str"` fails the build with `TS2322`. Re-verify that way rather than by reading timings: the old failure mode was silence.
