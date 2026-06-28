# Route Resilience Pattern Sweep (2026-06-29)

Read-only audit. No code changes were made. Scope: `web/next/src` (Next.js 16 App Router).

Follow-up to PR #583 (route error/loading boundaries + viewport idiom standardization). This sweeps the codebase for the same three patterns recurring elsewhere. Findings are judged against `.agents/skills/design/SKILL.md` (the "Layout and landmarks" section) and Next.js App Router error-boundary semantics — not invented standards.

## Summary

The PR #583 work is already comprehensive. The sweep found **zero high/med severity issues** and **one low-severity nit**. Boundary coverage is complete: every throwable layout has an error boundary in a parent segment (`app/error.tsx` / `app/global-error.tsx`), and `loading.tsx` exists exactly where PR #583 scoped it. The viewport idiom is applied consistently — no `min-h-dvh` / `min-h-screen` / raw `100vh` stragglers remain, every `min-h-svh` sits on a top-level surface, and every `flex-1` sits inside a flex parent. No redundant primitive wrappers exist in app code; the one `Empty` over-wrap PR #583 collapsed has no twin.

Findings by case:

- **Case 1 (boundary / loading gaps):** 0 high, 0 med, 0 low. Complete coverage.
- **Case 2 (redundant primitive wrappers):** 0 high, 0 med, 0 low.
- **Case 3 (viewport / fill idiom):** 0 high, 0 med, **1 low** (a defensible non-idiomatic-but-not-wrong `min-h-svh` on a marketing `<main>`, raised only for consistency; arguably won't-fix).

## Case 1 — Boundary coverage & layout-throw gaps

### Layout inventory (every `layout.tsx` under `web/next/src/app`)

| Layout                                  | Throwable async/server work?                                                                                                                                                                         | Boundary above it                                            | Verdict |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| `app/layout.tsx` (root)                 | No throwable work in the component body. The OG-URL helper (`getOgImageUrl`, `existsSync`) runs at **module eval**, not render, and `existsSync` does not throw on a missing path (returns `false`). | `app/global-error.tsx` (root-layout boundary, added in #583) | Covered |
| `app/(protected)/layout.tsx`            | **Yes** — `await auth.api.getSession()` (line 13). Also `redirect("/")` (Next-handled) and a `fetch` wrapped in `try/catch` (lines 23-30, swallowed).                                                | `app/error.tsx` (parent segment, added in #583)              | Covered |
| `app/(console)/console/layout.tsx`      | **Yes** — `await assertConsoleAccess()` (line 20), which awaits `auth.api.getSession`. The other path is `notFound()` (Next-handled).                                                                | `app/error.tsx` (parent segment)                             | Covered |
| `app/(console)/console/docs/layout.tsx` | No — synchronous (non-`async`); only builds a page tree from `consoleSource` (already-loaded MDX) and renders `DocsLayout`.                                                                          | n/a (sibling `(console)/console/error.tsx` exists anyway)    | No gap  |
| `app/(content)/blog/layout.tsx`         | No — synchronous (non-`async`); `getPublicBlogPageTree()` reads pre-loaded MDX.                                                                                                                      | n/a (static/content route — out of #583 scope)               | No gap  |
| `app/(content)/docs/layout.tsx`         | No — synchronous (non-`async`); `resolveDocsNav` + `docsSource.getPageTree()` over pre-loaded MDX.                                                                                                   | n/a (static/content route)                                   | No gap  |

**Result: no throwable layout falls through to Next's default error screen.** The two layouts that do throwable async work — `(protected)` and `(console)` — are both children of the `app/` root segment, and `app/error.tsx` (new in #583) is the error boundary that wraps the root segment's children. Per Next.js semantics, a segment's own `error.tsx` renders _inside_ that segment's `layout.tsx` and cannot catch its own layout's throw, which is exactly why #583 placed the boundary at `app/`, one level up. Correct.

`global-error.tsx` is the only thing that can catch a root-`layout.tsx` throw; it exists and renders its own `<html>/<body>`. Correct.

### Loading (`loading.tsx`) coverage

`loading.tsx` exists at `(protected)/loading.tsx` and `(console)/console/loading.tsx` — exactly the two data-heavy, per-request authenticated segments. Both render `<RouteLoading className="flex-1" />`.

No additional `loading.tsx` is warranted:

- `(content)/blog` and `(content)/docs` are `force-static` / prerendered MDX. Per the [blog-policy / #583 decision] a full-viewport spinner is the wrong fallback for prerendered content; #583 deliberately dropped a global `app/loading.tsx` for this reason. Respected — not flagged.
- `(console)/console/docs/[[...slug]]/page.tsx` does `await getPageData` but lives under the console shell, which already has `(console)/console/loading.tsx` as its segment-level fallback for navigations into the area. Adding a nested docs-only `loading.tsx` would be marginal; not flagged.
- `app/page.tsx`, `hire`, `resume`, `waitlist` are client/prerendered marketing surfaces — out of scope per #583.

**No `loading.tsx` gaps.**

### Case 1 findings: none.

## Case 2 — Redundant primitive wrappers

I enumerated every `<Empty>` usage and every self-filling/self-centering primitive in app code, then read each primitive's own classes in `components/ui/*` before judging.

`Empty` base classes (`components/ui/empty.tsx:10`): `flex w-full min-w-0 flex-1 flex-col items-center justify-center ...` — it self-fills and self-centers.

`<Empty>` call sites:

- `components/route-error.tsx:29` — `<Empty className={className}>`, where `className` is `flex-1` (nested boundaries) or `min-h-svh` (root/global). No wrapper div; the boundary file passes the fill class straight to `Empty`. Correct (this is the pattern #583 established).
- `components/blog/post-list.tsx:12` — `<Empty className="not-prose">`, returned directly from the component, no wrapper div. Correct.

No `<div className="flex ...">` exists whose sole job is to fill/center an already-self-filling child. The one over-wrap PR #583 collapsed has no surviving twin elsewhere.

`RouteLoading` (`components/route-loading.tsx`) is itself a `<div className="flex items-center justify-center">` wrapper around a bare `<Spinner />` — but that wrapper is _load-bearing_ (`Spinner` is just an icon with no layout of its own; the wrapper provides the centering box and receives the `flex-1`/`min-h-svh` fill class). Not redundant. Checked and kept.

### Case 2 findings: none.

## Case 3 — Viewport / fill idiom mis-application

Full grep of `min-h-svh | h-svh | min-h-dvh | h-dvh | min-h-screen | h-screen | 100vh | 100dvh | 100svh` and `flex-1` across `web/next/src`.

**No `min-h-dvh`, `min-h-screen`, or raw `100vh` stragglers remain.** PR #583's sweep holds; confirmed clean.

Every `min-h-svh` is on a legitimate top-level full-height surface:

- `app/layout.tsx:66` — `<body className="min-h-svh">`. Correct (top-level, matches the skill).
- `app/page.tsx:227` — hero `<section ... min-h-svh ...>`, with an inner `flex-1` pane (line 230) that fills it. Correct nested usage.
- `app/hire/page.tsx:152`, `app/resume/page.tsx:171` — marketing `<main className="... min-h-svh ...">`. Top-level page surfaces. Correct.
- `app/waitlist/page.tsx:92` — `<main className="flex min-h-svh ...">`. Top-level. Correct.
- `components/sidebar/shell.tsx:61` — `<main className="flex min-h-svh flex-1 flex-col">`. This is the canonical shell `<main>` the skill explicitly prescribes. Correct.
- `components/ui/sidebar.tsx:134,226` — shadcn-managed; `min-h-svh` / `h-svh` are upstream shadcn defaults. Out of scope (customize only via the generator).
- `app/error.tsx:6`, `app/global-error.tsx:14` — `min-h-svh` on the top-level/root boundary (no shell parent to fill). Correct per #583.

Every `flex-1` in app code sits inside a flex parent:

- `(protected)/error.tsx:6`, `(protected)/loading.tsx:4`, `(console)/console/error.tsx:6`, `(console)/console/loading.tsx:4` — `flex-1` passed into the shell's `flex ... flex-col` `<main>`. Correct.
- `app/page.tsx:230` — `flex-1` inside the `flex min-h-svh flex-col` hero section. Correct.
- `app/waitlist/page.tsx:129` — `sm:flex-1` on a `<Field>` inside the `sm:flex-row` form. Correct.
- Remaining `flex-1` hits are all in `components/ui/*` (shadcn) — out of scope.

No `flex-1` was found on a surface lacking a flex parent (no inert `flex-1`).

### Case 3 finding (LOW)

**`app/hire/page.tsx:152` and `app/resume/page.tsx:171` — `<main>` uses `min-h-svh` plus `space-y-16` rather than the `flex min-h-svh flex-col` shape.**

- **Issue:** These two marketing pages set `min-h-svh` on a non-flex `<main>` (`min-h-svh space-y-16 py-24`), whereas `waitlist` and the home hero use the `flex ... flex-col` shape. The viewport class is correct (`min-h-svh`, not `dvh`); the only inconsistency is that these `<main>`s are not flex containers.
- **Why it's real (but minor):** The design skill prescribes `min-h-svh` for top-level surfaces — which these are — so the _token_ is right. The skill does not require every top-level `<main>` to be `flex flex-col`; that shape is only mandated for the shell `<main>` (so its `flex-1` children can fill). Hire/resume have no child that needs to fill the viewport (they're top-anchored scrolling documents with `space-y-16`), so `min-h-svh` alone is the correct, intentional choice. This is a consistency observation, not a defect.
- **Severity:** low (arguably won't-fix).
- **Concrete fix (only if consistency is desired):** none required. Leave as-is. There is no rendering bug; converting to `flex flex-col` would add no value because there is no `flex-1` child to distribute. Documenting here so a future sweep doesn't re-flag it as a gap.

## Rejected candidates (checked, not real)

- **`components/route-loading.tsx` wrapper div** — `<div className="flex items-center justify-center">` around `<Spinner />`. Rejected: load-bearing. `Spinner` is a bare icon; the wrapper is the centering box that also receives the `flex-1`/`min-h-svh` fill class. Not a redundant nesting level.
- **`app/page.tsx:230` `flex-1` inside `flex-1`-less-looking markup** — Rejected: its parent `<section>` (line 227) is `flex min-h-svh flex-col`, so the `flex-1` correctly fills. Valid nested idiom.
- **`(content)/blog/layout.tsx` & `(content)/docs/layout.tsx` having no parent error boundary** — Rejected: both layouts are synchronous (non-`async`) and do no throwable server work (page-tree builders over pre-loaded MDX). No boundary needed; also content/static routes are out of #583 scope.
- **`(console)/console/docs/layout.tsx` having no async work but a parent boundary** — Rejected as a gap: it's synchronous, no throw risk. (A sibling `(console)/console/error.tsx` exists regardless.)
- **`(console)/console/docs/[[...slug]]/page.tsx` (`await getPageData`) needing its own `loading.tsx`** — Rejected: it's covered by the area-level `(console)/console/loading.tsx`, and its only throwable path is `notFound()` (Next-handled, not an error-boundary concern).
- **`app/layout.tsx` root doing `existsSync` / OG work without a boundary** — Rejected: runs at module eval, not render; `existsSync` returns `false` rather than throwing. And `global-error.tsx` covers root-layout throws anyway.
- **`(protected)/layout.tsx` `redirect("/")` and `(console)` `notFound()` as boundary gaps** — Rejected: `NEXT_REDIRECT` / `NEXT_NOT_FOUND` are intercepted by Next before any `error.tsx`. Not gaps (explicitly per the audit brief).
- **`components/ui/sidebar.tsx` `min-h-svh` / `h-svh` (lines 134, 226)** — Rejected: shadcn-managed upstream defaults; customize only via the generator, and these are correct anyway.
- **`<Empty>` in `blog/post-list.tsx` / `route-error.tsx`** — Rejected: both pass fill classes directly to `Empty` with no wrapper div. No redundant nesting.

## Prioritized recommendation

1. **No action required.** Boundary coverage, loading coverage, and the viewport idiom are all correct and complete after PR #583. The sweep confirms the patterns did not recur elsewhere.
2. **(Optional, low)** If strict shape-consistency across top-level `<main>`s is wanted, note hire/resume use `min-h-svh` without `flex flex-col`; this is intentional and not a defect — recommend leaving as-is and recording it (done here) so future sweeps don't re-raise it.
