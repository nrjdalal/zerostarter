# Component organization audit - `web/next/src/components`

Date: 2026-06-29
Scope: `web/next/src/components` and how the rest of the app imports from it.
Type: audit; the route/ grouping recommended below is implemented in this PR.

## Summary

`web/next/src/components` holds three kinds of things: shadcn-managed `ui/*` (73 files, generator-owned), three domain folders (`sidebar/`, `blog/`, `navbar/`), and **seven loose project components at the root** (`access.tsx`, `api-status.tsx`, `copy-as-markdown.tsx`, `devtools.tsx`, `mode-toggle.tsx`, `route-error.tsx`, `route-loading.tsx`).

The maintainer's instinct to group them is sound - the root currently mixes "directories" and "stray files" at the same level, which is the discoverability smell. But the proposed `components/zeroui` framing is **not** coherent: it implies a shadcn-`ui` vs project-`zeroui` axis, when the repo's actual, already-established convention is **by domain** (`sidebar/`, `blog/`, `navbar/`). A second flat catch-all bucket fights that convention and would itself become the next "junk drawer."

Recommendation: do the one high-value, low-churn move - group `route-error.tsx` + `route-loading.tsx` into `components/route/` (they are a documented pair, the `#583` route-boundary pattern, 6 import sites). Leave the other five at root for now; each is a singleton in its own concern with no natural folder-mate, and a `zeroui`/`shared`/`common` bucket would add churn without adding structure. Do **not** touch `ui/*`.

## Inventory

### (a) shadcn-managed `ui/*` - generator-owned, do NOT touch

73 files under `components/ui/` (accordion, alert, …, tooltip). These are wiped and re-scaffolded by `bun run shadcn:update`; the only sanctioned customization path is `.github/scripts/shadcn-customize.ts` (it hard-codes `UI = "web/next/src/components/ui"` and patches `button.tsx`, `spinner.tsx`, `sidebar.tsx`, plus `globals.css`). Out of scope for any grouping. `components.json` aliases `"ui": "@/components/ui"` - moving anything into `ui/` would collide with the generator.

### (b) Existing domain folders

| Folder     | Files                                                                                                                                                       | Imported from             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `sidebar/` | `console.tsx`, `dropdown-menu.tsx`, `floating-trigger.tsx`, `shell-sidebar.tsx`, `shell.tsx`, `user-menu.tsx`, plus nested `dashboard/` (3) and `docs/` (4) | app shell / route layouts |
| `blog/`    | `post-list.tsx` (`BlogPostList`)                                                                                                                            | `src/mdx-components.tsx`  |
| `navbar/`  | `home.tsx` (`Navbar`)                                                                                                                                       | `src/app/layout.tsx`      |

`sidebar/` already nests sub-domains (`dashboard/`, `docs/`), so the repo's grouping convention is by domain and can go more than one level deep. Note `blog/` and `navbar/` are each single-file folders - precedent that a domain folder with one file is acceptable here.

### (c) Loose root-level project components

| File                   | What it is                                                             | `"use client"` | Imported from (count)                                                                                       |
| ---------------------- | ---------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `access.tsx`           | `Access` - auth sign-in dialog (magic link / GitHub / Google / agents) | yes            | `components/navbar/home.tsx` (1)                                                                            |
| `api-status.tsx`       | `ApiStatus` - polled `/health` status pill                             | yes            | `app/page.tsx` (1)                                                                                          |
| `copy-as-markdown.tsx` | `CopyAsMarkdown` - docs "copy as markdown" button                      | yes            | `lib/fumadocs.tsx` (1)                                                                                      |
| `devtools.tsx`         | `DevTools` - RQ devtools + breakpoint/dimension overlay                | yes            | `app/providers.tsx` (1) + `content/docs/manage/analytics.mdx` (doc example)                                 |
| `mode-toggle.tsx`      | `ModeToggle` - theme switch button                                     | yes            | `components/navbar/home.tsx` (1)                                                                            |
| `route-error.tsx`      | `RouteError` - `Empty`-based error boundary body                       | yes            | `app/error.tsx`, `app/global-error.tsx`, `app/(console)/console/error.tsx`, `app/(protected)/error.tsx` (4) |
| `route-loading.tsx`    | `RouteLoading` - centered `<Spinner />` for `loading.tsx`              | no             | `app/(console)/console/loading.tsx`, `app/(protected)/loading.tsx` (2)                                      |

Total: 10 import sites across the seven files. `route-error` (4) and `route-loading` (2) dominate; the other five are 1 import each.

## Options weighed

### Option 1 - Keep flat (status quo)

- Churn: none.
- Discoverability: poor and getting worse. Root mixes folders and files; a reader scanning `components/` sees four dirs interleaved with seven files. The `route-*` pair in particular reads as two unrelated files rather than the one route-boundary concern they are.
- `ui/` boundary: fine.
- Consistency: inconsistent with the `sidebar/`/`blog/`/`navbar/` by-domain convention the repo already follows.
- Verdict: acceptable but leaves the documented `route-*` pair scattered. The trigger for this audit.

### Option 2 - Single catch-all bucket (`components/zeroui` / `components/shared` / `components/common`)

- Churn: 10 import sites rewritten; for the lowest payoff (a flat list just moves down one level).
- Discoverability: marginal. A `zeroui`/`shared`/`common` folder is a junk drawer by definition - it tells you "project-owned, not shadcn" but nothing about what each file _does_. The next loose component lands there too, and the smell returns one level deeper.
- `ui/` boundary: the **`zeroui` framing specifically is the problem.** It encodes a shadcn-`ui` vs project-`zeroui` axis. But these seven files are not a peer design-system layer to `ui/` - `access` is an auth feature, `copy-as-markdown` is a docs control, `devtools` is a dev overlay, `route-*` is route plumbing. Grouping them by "who authored them" cuts across the by-domain axis the repo actually uses (`sidebar/`/`blog/`/`navbar/` are _domains_, not "non-shadcn"). A `zeroui` bucket would be the only folder organized on a different principle than its siblings.
- Consistency: actively fights the established convention. **Reject `zeroui`** (and `shared`/`common` for the same junk-drawer reason).
- Verdict: rejected. Author-vs-shadcn is the wrong axis; the repo groups by domain.

### Option 3 - By-domain folders (matches repo convention)

Group only where a real shared concern exists; leave true singletons at root.

- `route-error.tsx` + `route-loading.tsx` → `components/route/` (or `components/boundaries/`). These two are a genuine pair: they are the `#583` route-boundary pattern (see git history `c932d9d3`, `90a5ccc8`, `87ea3a2b` and `.github/audit/2026-06-29-route-resilience-pattern-sweep.md`), consumed exclusively by Next's `error.tsx`/`loading.tsx`/`global-error.tsx` conventions, and they share the `flex-1`/`min-h-svh` fill-class contract documented in the design skill. They belong together. 6 of the 10 import sites.
- The other five (`access`, `api-status`, `copy-as-markdown`, `devtools`, `mode-toggle`) are each a singleton in its own concern with no folder-mate. A one-file `auth/`, `docs/`, `theme/`, etc. each would out-fragment even `blog/`/`navbar/` and add five rename batches for zero grouping benefit. Leave at root.
- Churn: 6 import sites (route pair only).
- Discoverability: good. The route-boundary concern becomes one obvious folder; the remaining root files are genuinely standalone and read fine as singletons.
- `ui/` boundary: untouched.
- Consistency: matches `sidebar/`/`blog/`/`navbar/` exactly (by domain, single-file folders already exist).
- Verdict: recommended - but only the `route/` move. Resist pre-emptively foldering the five singletons.

## Recommendation

**One-line:** Group `route-error.tsx` + `route-loading.tsx` into `components/route/`; reject the `zeroui` bucket (wrong axis) and leave the other five root components flat as standalone singletons.

Do not create a `zeroui`/`shared`/`common` folder: it organizes by "who wrote it" while the repo organizes by domain, and it would become the next junk drawer. Do not touch `ui/*` (generator-owned).

Concrete moves (history-preserving; applied in this PR):

```bash
cd web/next
mkdir -p src/components/route
git mv src/components/route-error.tsx   src/components/route/error.tsx
git mv src/components/route-loading.tsx src/components/route/loading.tsx
```

(Dropping the `route-` prefix once inside `route/` - `route/error.tsx`, `route/loading.tsx` - mirrors how `sidebar/` and `blog/` name files by role inside the folder, not `sidebar-console.tsx`. If the maintainer prefers minimal diff, keep the filenames and only move the folder.)

Then update the 6 importers:

- `@/components/route-error` → `@/components/route/error` in: `app/error.tsx`, `app/global-error.tsx`, `app/(console)/console/error.tsx`, `app/(protected)/error.tsx`
- `@/components/route-loading` → `@/components/route/loading` in: `app/(console)/console/loading.tsx`, `app/(protected)/loading.tsx`

If kept minimal (move folder, keep filenames `route/route-error.tsx`), the import becomes `@/components/route/route-error` - uglier; prefer the role-named form above.

Leave alone: `access.tsx`, `api-status.tsx`, `copy-as-markdown.tsx`, `devtools.tsx`, `mode-toggle.tsx`. Revisit only if a second component appears in any of those concerns (e.g. a second theme control would justify `theme/`).

## Blast radius

- **Import sites changed:** 6 (the four `error`/`global-error` boundaries + the two `loading.tsx`). All use the `@/components/...` alias, so each is a one-line specifier edit; no relative-path math. The other four loose files' importers are untouched under this recommendation.
- **Tooling / config:** none. `components.json`, `next.config.ts`, `web/next/vercel.json`, and `tsconfig` contain **no** references to these component paths (grep confirmed). The `@/` alias is path-prefix based, so a new `route/` subfolder needs no config change.
- **shadcn sync / customize script:** zero impact. `shadcn-customize.ts` and `bun run shadcn:update` operate only inside `components/ui/` (the script hard-codes `UI = "web/next/src/components/ui"`); they never see project components. `route/` lives outside `ui/`, so sync will not wipe or touch it.
- **Docs that must stay in sync (per the "docs must never drift" rule):**
  - `web/next/content/docs/manage/analytics.mdx:83` contains `import { DevTools } from "@/components/devtools"` inside a fenced code block mirroring `src/app/providers.tsx`. This is **not affected** by the recommended `route/` move (devtools stays put). Flagged here only because if `devtools.tsx` were ever moved (not recommended), this doc block would also need updating.
  - No docs reference `route-error`/`route-loading` import paths; the only mentions are in prior audit docs (`.github/audit/2026-06-29-route-resilience-pattern-sweep.md`), which are dated historical records and should not be rewritten.
- **Design skill:** `.agents/skills/design/SKILL.md` references these components by role ("`<Spinner />`", route `error`/`loading` fill-class idiom) but **never by file path**, so the skill needs no update for the `route/` move.
