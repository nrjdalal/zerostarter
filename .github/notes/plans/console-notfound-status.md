# Console not-found returns HTTP 200 (soft 404)

- Status: backlog
- Links: PR #691 review

A `notFound()` inside the `(console)` area renders the not-found UI but returns HTTP 200, not 404. Cause: `console/layout.tsx` is `export const dynamic = "force-dynamic"` (so the admin gate runs on every request), and Next.js commits the 200 status line before a page-level `notFound()` fires mid-stream.

Pre-existing, not introduced by the feature flags: a genuinely missing slug (`/console/docs/does-not-exist`) returns 200 with every feature on, and the old console docs page already called `notFound()` for missing slugs. Note the asymmetry: a URL matching no route at all (`/console/nope`) still returns a real router-level 404, and the layout-level auth `notFound()` also returns 404 (it fires before streaming starts); only a page-level `notFound()` degrades to 200.

Low severity: the correct not-found UI shows (no content leaks), and `/console` is `robots: noindex` and admin-gated, so there is no SEO cost. The only practical downside is that a programmatic client cannot distinguish missing-vs-ok by status on console routes. A real fix is framework-rooted (decide existence before the force-dynamic stream, e.g. in middleware or a segment that can set the status pre-stream); not worth that surgery for a noindex admin area.
