# Console not-found status and the anonymous white flash

- Status: backlog
- Links: PR #691 review; PR #758 review

A `notFound()` inside the `(console)` area renders the not-found UI but returns HTTP 200, not 404. Cause: `console/layout.tsx` is `export const dynamic = "force-dynamic"` (so the admin gate runs on every request), and Next.js commits the 200 status line before a page-level `notFound()` fires mid-stream.

Pre-existing, not introduced by the feature flags: a genuinely missing slug (`/console/docs/does-not-exist`) returns 200 with every feature on, and the old console docs page already called `notFound()` for missing slugs. It is page-level `notFound()` specifically that degrades; the layout-level auth `notFound()` still returns a real 404, because it fires before streaming starts.

Since #758 that covers every unknown console path too. The `[...unmatched]` catch-all exists so a forbidden page and a nonexistent one cannot be told apart, and the cost of matching a route instead of missing one is that `/console/nope` now answers 200 like the rest rather than a router-level 404. That is the trade taken deliberately: identical answers at every rung matter more here than the status line on a noindex area.

## The anonymous white flash (PR #758)

The same streaming boundary produces a second, visible symptom. An anonymous visitor hitting any `/console` URL is refused by the layout gate, and a layout-thrown `notFound()` cannot unwind into the parent layout that has already begun streaming, so Next serves its internal fallback: a document with an empty body carrying `NEXT_HTTP_ERROR_FALLBACK;404`. The browser paints white, hydrates, and only then renders the 404. Adding an app-level `not-found.tsx` (which #758 did) themes every other 404 but cannot reach this one.

Two exits, both rejected for now. Rendering the not-found from the layout instead of throwing removes the flash and themes it, at the cost of returning 200 where a real 404 is returned today. Gating in middleware fixes both this and the soft-404 above, with a real status and no React render, but adds a middleware layer and a session lookup per console request.

Scope check: it is one white paint, for someone with no console access typing a gated address directly, on a noindex area. Every console path still answers identically at every rung, so nothing is enumerable either way.

Low severity: the correct not-found UI shows (no content leaks), and `/console` is `robots: noindex` and gated at member and above, so there is no SEO cost. The only practical downside is that a programmatic client cannot distinguish missing-vs-ok by status on console routes. A real fix is framework-rooted (decide existence before the force-dynamic stream, e.g. in middleware or a segment that can set the status pre-stream); not worth that surgery for a noindex, gated area.

## Next 16.3's `catchError` does not fix it (spiked)

16.3 says error boundaries previously "interfered with application code that called `notFound` or `redirect`", which reads like this bug. It is a different mechanism, and converting the boundary changes nothing here.

Spiked by rewriting `(console)/console/error.tsx` onto `catchError` from `next/error` and re-measuring against a live dev server, with `/console/users` as a control:

| Path                       | Before | With `catchError` |
| -------------------------- | ------ | ----------------- |
| `/console/does-not-exist`  | 200    | **200**           |
| `/console/users` (control) | 200    | 200               |
| `/nope-at-root` (control)  | 404    | 404               |

What 16.3 fixed is a boundary swallowing the `notFound` signal. What happens here is the status line being committed before the page-level `notFound()` fires mid-stream, exactly as described above, which no boundary can reach. Reverted; the entry stands.

Watch the control: an earlier run of this spike showed 404 and looked like a fix, because the dev server had died and every path was answered by the proxy. `/console/users` returning 404 was the tell.
