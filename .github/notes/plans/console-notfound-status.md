# Console not-found returns HTTP 200 (soft 404)

- Status: backlog
- Links: PR #691 review; PR #758 review

A `notFound()` inside the `(console)` area renders the not-found UI but returns HTTP 200, not 404. Cause: `console/layout.tsx` is `export const dynamic = "force-dynamic"` (so the admin gate runs on every request), and Next.js commits the 200 status line before a page-level `notFound()` fires mid-stream.

Pre-existing, not introduced by the feature flags: a genuinely missing slug (`/console/docs/does-not-exist`) returns 200 with every feature on, and the old console docs page already called `notFound()` for missing slugs. Note the asymmetry: a URL matching no route at all (`/console/nope`) still returns a real router-level 404, and the layout-level auth `notFound()` also returns 404 (it fires before streaming starts); only a page-level `notFound()` degrades to 200.

## The anonymous white flash (PR #758)

The same streaming boundary produces a second, visible symptom. An anonymous visitor hitting any `/console` URL is refused by the layout gate, and a layout-thrown `notFound()` cannot unwind into the parent layout that has already begun streaming, so Next serves its internal fallback: a document with an empty body carrying `NEXT_HTTP_ERROR_FALLBACK;404`. The browser paints white, hydrates, and only then renders the 404. Adding an app-level `not-found.tsx` (which #758 did) themes every other 404 but cannot reach this one.

Two exits, both rejected for now. Rendering the not-found from the layout instead of throwing removes the flash and themes it, at the cost of returning 200 where a real 404 is returned today. Gating in middleware fixes both this and the soft-404 above, with a real status and no React render, but adds a middleware layer and a session lookup per console request.

Scope check: it is one white paint, for someone with no console access typing a gated address directly, on a noindex area. Every console path still answers identically at every rung, so nothing is enumerable either way.

Low severity: the correct not-found UI shows (no content leaks), and `/console` is `robots: noindex` and admin-gated, so there is no SEO cost. The only practical downside is that a programmatic client cannot distinguish missing-vs-ok by status on console routes. A real fix is framework-rooted (decide existence before the force-dynamic stream, e.g. in middleware or a segment that can set the status pre-stream); not worth that surgery for a noindex admin area.
