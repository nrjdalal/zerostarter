# FE refinements: audit + plan (2026-06-29)

Post-release (v0.0.66) frontend audit, scoped to `web/next/src`, covering what's **beyond** the CSS/UI audit (`2026-06-28-css-audit.md`, fully applied via #577/#580/#582). A first automated pass over-reported; every finding below is verified against current canary, and the false positives are recorded at the end so they don't resurface.

## Verified findings

### High

**H1 — Dashboard and console pages are empty stubs.**
`app/(protected)/dashboard/page.tsx` and `app/(console)/console/page.tsx` are each `export default function Page() { return null }`. The route **layouts are fully built**: `(protected)/layout.tsx` gates auth (`redirect("/")` when unauthenticated), seeds the active org, and wraps content in `SidebarShell` with the org-switcher header + user-actions footer. So a signed-in user sees the full sidebar chrome around a blank content pane. The starter's core post-auth surfaces render nothing.
→ Ship minimal content. Dashboard: greeting + active-org summary + quick links (settings/console/docs). Console: an admin landing. Use the `DashboardShell`/`DashboardHeader` page-content wrapper (`max-w-4xl`, `p-4 sm:p-6`) from #575.

**H2 — No route-level error or loading boundaries.**
No `error.tsx` or `loading.tsx` in any route group. The `(protected)`/`(console)` trees do auth + async data (getSession, org-set, React Query); an exception falls through to Next's default error screen, and slow loads show nothing. Not production-grade resilience for a "production-ready" starter.
→ Add `error.tsx` (friendly message + `reset()`) and `loading.tsx` (skeleton/`Spinner`) to `(protected)` and `(console)` at minimum; `(content)` if cheap. Built from the existing `Empty` + `Spinner` primitives.

### Medium

**M1 — Hero inner `min-h-[700px]`** (`app/page.tsx:231`). Arbitrary fixed height; on a viewport shorter than 700px it forces overflow. → Responsive: rely on the outer `min-h-dvh` + flex centering, or `min-h-dvh` on mobile with the 700px only at `sm:`+.

**M2 — Hardcoded grid color `#80808012`** (`app/page.tsx:229`). Raw hex in the hero grid `linear-gradient`; ignores the token system and won't track theme changes. → Add a `--color-grid` token (low-alpha, border-derived oklch) to `globals.css` + the `@theme` map and reference it. (CSS-audit open decision #8.)

### Low / polish

**L1 — Section body copy not responsive.** Section descriptions are `text-lg` with no mobile step while the hero scales (`sm:text-xl lg:text-2xl`). → `text-base sm:text-lg` on section body copy.

**L2 — Marketing heading weight.** hire/resume `font-semibold` vs home `font-bold`. → Decide: unify, or document as deliberately distinct (personal pages vs product landing). (CSS-audit open decision #2.)

**L3 — Empty catch in `(protected)/layout.tsx:29`.** The best-effort active-org seed swallows errors silently (`catch {}`). Low-risk (a convenience seed), but a one-line server log would aid debugging. → Log or leave.

**L4 — (Unverified) focus-visible on bare navbar links.** Buttons inherit the ring from `buttonVariants`, but the bare `<a>` nav links may lack a visible focus indicator. → Verify with keyboard; add `focus-visible:` if missing.

## Plan — sequenced PRs (one concern each)

**PR 1 — Route resilience (H2).** `error.tsx` + `loading.tsx` for `(protected)` and `(console)` (and `(content)` if cheap). Error UI = centered `Empty`-style message + reset button; loading = `Spinner`/skeleton. Self-contained, no deps, smallest + high value — do first.

**PR 2 — Dashboard + console content (H1).** Replace the `return null` stubs with real pages. Gated on #575 (DashboardShell/DashboardHeader): land #575 first, or include the wrapper here. Keep it minimal and starter-appropriate — welcome, active-org card, quick links; no invented product features.

**PR 3 — Marketing FE polish (M1, M2, L1, L2).** Hero responsive height, `--color-grid` token, responsive body copy, heading-weight decision. One cohesive marketing PR. Surface the token + heading-weight choices before committing (design-token decisions are the maintainer's).

L3/L4 fold into whichever PR touches those files.

## Dropped — first-pass false positives (recorded so they don't recur)

- **"Add a root `<main>`"** — would nest with the per-page `<main>` (deliberate convention). Rejected.
- **`.catch(()=>{})`, `mb-18`, `gap-7.5`** — already fixed/snapped in #577.
- **"Spinner unused / loaders hand-rolled"** — `Spinner` is adopted in 4 files; `RiLoaderLine` lives only inside the `spinner`/`sonner` primitives.
- **`min-w-48` "off-ladder"** — on the Tailwind scale and intentional (stable api-status pill width across states).
- **Hire "six `<h1>`s"** — exactly one `<h1>`; hierarchy is correct.
