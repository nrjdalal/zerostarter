# One nav model and a deep SidebarShell

- Status: backlog
- Links: 2026-07-12 architecture review (deep-module lens)

The three domain sidebars (`components/console/sidebar.tsx`, `components/dashboard/sidebar.tsx`, `components/docs/sidebar.tsx`) each reimplement the same mechanics behind the "sidebar" idea: the mobile-close closure `if (isMobile) setOpenMobile(false)` appears five times, active-state (`isActive`) is reimplemented three times (and dashboard omits it entirely, so its links never highlight), the `data-active:font-normal` convention is sprinkled per file, and there are three different nav-item shapes for one concept. Separately, `components/shell/sidebar-adaptive.tsx` is a `"use client"` file that exists only to host one `isDocsPath` ternary, and `app/(content)/docs/layout.tsx` forks the shell chrome that `SidebarShell` already owns, drifting on the `sidebar_state` cookie so open-state persistence differs between docs and app.

Deepen into two modules:

1. `SidebarNav({ groups })` renders items, computes active (including the group rollup), applies `data-active`, and closes on mobile; each domain passes a `NavGroup[]`. Collapses the five close copies, the three active-state implementations, and the three item shapes into one, and dashboard gets active-state for free.
2. `SidebarShell({ mode })` owns docs-vs-app placement, so the docs layout drops its forked chrome and `sidebar-adaptive.tsx` is deleted (and the docs cookie drift is fixed).

Turns three sidebars from logic into config. Medium effort.
