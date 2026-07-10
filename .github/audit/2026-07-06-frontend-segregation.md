# Frontend segregation audit — web/next/src/components

- Date: 2026-07-06
- Branch: `refactor/frontend-segregation` (base `canary`)
- Scope: frontend component organization only. No behavior change: pure move + merge + import-rewrite.

## Goal

Minimize the frontend's file footprint and group components by feature, so the tree reads the way the app is built.

## What was wrong

1. **`components/dashboard/` was mislabeled.** `DashboardShell` + `DashboardHeader` there were imported by _both_ the dashboard and console route groups: they are the shared page shell, not dashboard-specific. The real dashboard-only pieces lived under `components/sidebar/dashboard/`, so "dashboard" named two different things in two folders.
2. **`components/sidebar/` was a grab-bag** mixing shared shell chrome (`shell`, `shell-sidebar`, `dropdown-menu`, `floating-trigger`, `user-menu`) with per-area content (`console`, `dashboard/`, `docs/`).
3. **Four loose top-level files** with no group: `access`, `mode-toggle`, `devtools`, `copy-as-markdown`.
4. **Barrel-backed multi-file folders**: the docs sidebar was 4 files (content/footer/search + index barrel) and the dashboard sidebar 3 (org-switcher/user-actions + index) for one cohesive unit each.

## Decisions

- **Group by feature/domain** (flat, one folder per area).
- **Keep the full shadcn kit.** 41 of 77 `components/ui/` primitives have zero importers, but `.github/scripts/shadcn-update.sh` runs `shadcn add -a` and ships the whole registry on purpose (a fork can reach for any primitive with no setup). These are intentional surface, not dead code, and a sync would re-pull them anyway. Trimming would mean switching the sync to a curated list and is out of scope.
- **Consolidate cohesive multi-file units into one file**, dropping barrels, except where a React client/server boundary forbids it.

## Before → after

```
BEFORE (non-ui)                          AFTER (non-ui)
components/                               components/
  access.tsx                                common/access.tsx
  mode-toggle.tsx                           common/mode-toggle.tsx
  devtools.tsx                              common/devtools.tsx
  copy-as-markdown.tsx                      common/navbar.tsx
  navbar/home.tsx                           common/route-error.tsx
  route/error.tsx                           common/route-loading.tsx
  route/loading.tsx                         shell/page-shell.tsx
  dashboard/header.tsx                      shell/page-header.tsx
  dashboard/shell.tsx                       shell/sidebar-shell.tsx
  sidebar/shell.tsx                         shell/sidebar-adaptive.tsx
  sidebar/shell-sidebar.tsx                 shell/sidebar-dropdown-menu.tsx
  sidebar/dropdown-menu.tsx                 shell/sidebar-floating-trigger.tsx
  sidebar/floating-trigger.tsx              shell/sidebar-user-menu.tsx
  sidebar/user-menu.tsx                     dashboard/sidebar.tsx
  sidebar/console.tsx                       console/sidebar.tsx
  sidebar/dashboard/{index,                 docs/sidebar.tsx
    org-switcher,user-actions}.tsx          docs/copy-as-markdown.tsx
  sidebar/docs/{index,content,              blog/post-list.tsx
    footer,search}.tsx                      marketing/{api-status,
  blog/post-list.tsx                          background-gradient,landing-background}.tsx
  marketing/*.tsx                           ui/  (77 shadcn primitives, untouched)
  ui/*
```

Non-ui file count: **27 → 21**. Barrels removed. `ui/` untouched.

## Consolidations

- `docs/sidebar.tsx` ← content + footer + search + (barrel) — all `"use client"`.
- `dashboard/sidebar.tsx` ← org-switcher + user-actions + (barrel) — all `"use client"`.

**Deliberately NOT merged** (client/server boundary or file-per-export):

- `common/route-error.tsx` (`"use client"` error boundary) kept apart from `common/route-loading.tsx` (server spinner); merging would force the spinner into the client bundle.
- `shell/sidebar-shell.tsx` (`SidebarShell`, async server component) kept apart from its client helpers `shell/sidebar-adaptive.tsx` and `shell/sidebar-floating-trigger.tsx`.
- `shell/page-shell.tsx` (`PageShell`) and `shell/page-header.tsx` (`PageHeader`), both server, kept as one component per file (the folder move de-mislabels the old `DashboardShell`/`DashboardHeader` without an artificial merge).

## Cross-cutting fix

The CLI fork-converter (`packages/cli/src/convert.ts`) hardcodes the navbar path to strip the author `/hire` nav entry during `zerostarter init`. Moving `navbar/home.tsx` → `common/navbar.tsx` required updating that path (plus its test and the project-structure doc), otherwise the strip would silently no-op and every fork would ship a dead `/hire` link.

## Docs synced

`manage/dashboard.mdx`, `manage/theming.mdx`, `manage/authentication.mdx`, `getting-started/project-structure.mdx`.

## Naming

Now that the folder conveys the area, redundant `Sidebar…` prefixes were dropped and the shared page shell was de-misnamed. In `shell/` every file basename matches its primary export (the sidebar chrome forms a uniform `sidebar-*`/`Sidebar…` family, the page container a `page-*`/`Page…` one):

| Before                        | After                  | File                    |
| ----------------------------- | ---------------------- | ----------------------- |
| `DashboardShell`              | `PageShell`            | `shell/page-shell.tsx`  |
| `DashboardHeader`             | `PageHeader`           | `shell/page-header.tsx` |
| `SidebarDashboardOrgSwitcher` | `OrgSwitcher`          | `dashboard/sidebar.tsx` |
| `SidebarDashboardUserActions` | `DashboardUserActions` | `dashboard/sidebar.tsx` |
| `SidebarConsoleHeader`        | `ConsoleSidebarHeader` | `console/sidebar.tsx`   |
| `SidebarConsoleContent`       | `ConsoleNav`           | `console/sidebar.tsx`   |
| `SidebarDocsContent`          | `DocsNav`              | `docs/sidebar.tsx`      |
| `SidebarDocsFooter`           | `DocsFooter`           | `docs/sidebar.tsx`      |
| `SidebarDocsSearch`           | `DocsSearch`           | `docs/sidebar.tsx`      |

Shell chrome files were renamed so each basename matches its export: `sidebar-shell.tsx` (`SidebarShell`), `sidebar-adaptive.tsx` (`SidebarAdaptive`, was `adaptive-sidebar.tsx`/`AdaptiveShellSidebar`), `sidebar-floating-trigger.tsx` (`SidebarFloatingTrigger`), `sidebar-dropdown-menu.tsx` (`SidebarDropdownMenu`, no longer shadowing `ui/dropdown-menu.tsx`), `sidebar-user-menu.tsx` (`SidebarUserMenu`). The merged `content.tsx` split into `page-shell.tsx` + `page-header.tsx` (one component each). The `data-slot` values on the page shell (`page-shell`, `page-header`) match too; nothing selects them.

## lib/ consolidation

`lib/` was audited separately and is largely healthy: no barrels, no mislabels, each file a distinct single-responsibility module. Merging unrelated utilities would create grab-bags, so only genuinely-cohesive splits were collapsed (16 files → 14):

- `docs/nav.ts` + `docs/types.ts` → **`lib/docs.ts`** — one domain; `nav` builds on `types`. Importers of `@/lib/docs/nav` and `@/lib/docs/types` collapse to `@/lib/docs`.
- `sort-by-meta.ts` → folded into **`lib/llms.ts`** — its only two consumers are the llms.txt routes.

**Kept split (rationale):**

- `auth/` (client + console + index) — `auth/client.ts` is the `better-auth/react` client SDK and must not share a module with the server auth; `console`/`index` are distinct layers (authz policy vs session accessor).
- `blog.ts` + `blog-policy.ts` — `blog-policy` is a shared policy module (imported by `fumadocs`, `sitemap`, `post-list`, not only `blog`) with its own deferred test surface.
- `config`, `source`, `fumadocs`, `og-image`, `fonts`, `utils`, `llms` — distinct heavily-used core modules.

**Cross-cutting refs updated for the `docs/` merge:** `web/next/docs.config.ts` and the CLI's `docsConfigTemplate()` (`packages/cli/src/templates.ts`) both import `DocsConfig` from `./src/lib/docs/types`; without the fix, a scaffolded fork's `docs.config.ts` would import a missing module. The build script `.github/scripts/docs.ts` also imported `DocsCollection`/`DocsItem`/`DocsMeta` from `./src/lib/docs/types` and is repointed to `./src/lib/docs`; it is checked by `check-types:scripts` (a separate tsconfig from `web/next`), so missing it reds the CI build.

## Verification

- `tsc --noEmit`: clean
- `oxlint`: clean
- `oxfmt`: clean
- `bun test packages/cli/test`: 85 pass (convert + templates + …)
