---
name: shadcn-sync
description: Run and reconcile the shadcn component sync (`bun run shadcn:update`). Use when refreshing shadcn components, or when a sync regresses a local customization or breaks the build.
---

# Shadcn Sync

`bun run shadcn:update` regenerates the whole shadcn layer from the registry: it wipes `web/next/src/components/ui` + `components.json`, re-inits, re-adds every component, formats, then **self-reconciles every local override** via `.github/scripts/shadcn-customize.ts`, formats again, and runs the postinstall (`bun i`). Reconciliation is programmatic and idempotent — running it on a clean tree yields a clean tree. The only diff you should ever see afterwards is a genuine upstream change to a component you keep, which is yours to review.

## Procedure

Run on a clean tree, then work the (now-small) diff:

1. **Sync** — `bun run shadcn:update`.
2. **Review the diff** (`git diff`). On a clean tree this is empty unless the registry genuinely changed a component. That residual diff is the whole point: it isolates real upstream deltas from override churn, so you keep an improvement or handle a breaking change deliberately.
3. **Build** — `cd web/next && bun run build` (or `bun run check-types`). The type-check covers every `.tsx`, including dead ones like `calendar.tsx`.
4. **Commit** only the genuine registry deltas.

## What `shadcn-customize.ts` reconciles

It runs after `add -a`, and after the first format pass — so its anchors match stable formatted output (matching raw pre-format output is what used to make it brittle). Two strategies:

**Restore from HEAD** — files we own outright; the sync's version carries nothing we want:

- `bun.lock` + `web/next/package.json` — `add` rewrites ~15 deps from `catalog:` to pinned ranges (and force-bumps `react-day-picker` past the catalog's `^9`). The catalog is the source of truth; the restore puts every entry back to `catalog:`, then the wrapper's `bun i` reconciles the lockfile.
- `web/next/src/app/layout.tsx` — `init` re-injects `next/font/google` (Inter); we self-host via `next/font/local` (see the `fonts` skill).
- `web/next/src/lib/utils.ts` — `init` drops the repo helpers (`slugify`, imported by `org-switcher`; `generateId`).

After the restore it drops `node_modules/react-day-picker` (root + `web/next`) so the wrapper's `bun i` reinstalls the catalog's pinned v9 — a plain install won't downgrade it. `calendar.tsx` is **not** restored: it carries no local override, so it tracks the registry as-is. Its current `month_grid` key is valid on v9 (`getDefaultClassNames().month_grid`); the older committed copy used the v9-`@deprecated` `table` alias, now adopted from upstream.

**Patch in place** — registry components we extend; the transform keeps any upstream improvement and re-applies only our delta. Each patch is idempotent and asserts its anchor, so a shadcn shape change fails the sync loudly instead of silently dropping the override:

- `globals.css` — `--font-sans` points back at the brand DM Sans variable (init repoints it at its own Inter variable).
- `button.tsx` — the Base UI render wiring (`render`, `nativeButton={!render}`, `render={render}`).
- `spinner.tsx` — `React.ComponentProps<RemixiconComponentType>` typing (registry retypes to `"svg"`).
- `sidebar.tsx` — `SidebarTrigger` gains an optional `children` label (the retired `zeroui/sidebar-trigger` fork).

## Notes

- **Add a new override here, never by hand.** `add -a` overwrites `ui/` every run, so any local edit to a `ui/` component (or to a restored file) must go through `shadcn-customize.ts`: add a `patch()` with an idempotency guard and asserted anchors, or extend `RESTORE`. Hand-edits are wiped on the next sync.
- `shadcn-customize.ts` runs `git checkout HEAD --` on the restore set, so **run on a clean tree** — uncommitted changes to those files are clobbered.
- `add -a` re-adds ALL components, so unused ones (`calendar.tsx`, `chart.tsx`, ...) reappear every run. Expected — don't delete them to chase a dead-code report.
- If the postinstall throws `ReferenceError` from `.github/scripts/deps-manager.ts`, the catalog rewrite is broken and takes the sync down; that script must write to its loop variable.
- The root `catalog` is the source of truth for versions; trust it over whatever `@latest` drags into the lockfile.
