---
name: shadcn-sync
description: Run and reconcile the shadcn component sync (`bun run shadcn:update`). Use when refreshing shadcn components, or when a sync regresses a local customization or breaks the build.
---

# Shadcn Sync

`bun run shadcn:update` regenerates the whole shadcn layer from the registry, then re-applies every local override programmatically. It is **self-reconciling**: run it on a clean tree and you get a clean tree back. The only diff you should ever see afterwards is a genuine upstream change to a component, which is yours to review.

`bun run shadcn:update` runs `bash .github/scripts/shadcn-update.sh && bun i`. The script refuses to run on a dirty blast radius, then: wipe `web/next/src/components/ui` + `components.json` → `shadcn init` → `shadcn add -a` → `shadcn-customize.ts` → `oxfmt`. The trailing `bun i` (the wrapper, not the script) reinstalls the dropped `react-day-picker` at the pinned v9 and reconciles the lockfile.

## Procedure

1. **Run** on a clean tree: `bun run shadcn:update`.
2. **Review** `git diff` — empty unless the registry genuinely changed a component. That residual is the whole point: it isolates real upstream deltas from override churn, so you keep an improvement or handle a break deliberately.
3. **Build**: `cd web/next && bun run build` (or `bun run check-types`). The type-check covers every `.tsx`, including unused ones like `calendar.tsx`.
4. **Commit** only the genuine registry deltas.

## What `shadcn-customize.ts` reconciles

**Restore from HEAD** — files the sync re-scaffolds but we own outright:

- `bun.lock` + `web/next/package.json` — `add -a` rewrites deps off `catalog:` to pinned ranges; reset them, then `bun i` reconciles the lockfile.
- `web/next/src/app/layout.tsx` — `init` injects `next/font/google`; we self-host via `next/font/local` (see the `fonts` skill).
- `web/next/src/lib/utils.ts` — `init` drops the repo helpers (`slugify`, `generateId`).

It then drops `react-day-picker` from `node_modules` so `bun i` reinstalls the catalog-pinned v9 (a plain install won't downgrade it).

**Patch in place** — registry components we extend, edited structurally with ts-morph (located by AST shape, so whitespace and attribute/param reordering can't break them) plus one guarded string swap for CSS. Each is idempotent and throws if its target is missing, so an upstream shape change fails the sync loudly:

- `button.tsx` — Base UI render wiring (`render`, `nativeButton={!render}`, `render={render}`)
- `spinner.tsx` — `React.ComponentProps<RemixiconComponentType>` typing
- `sidebar.tsx` — optional `children` label on `SidebarTrigger`
- `globals.css` — `--font-sans` points at the brand DM Sans variable

`calendar.tsx` is **not** touched: it carries no local override and tracks the registry as-is (we pin `react-day-picker` to `^9`; the registry component is v9-compatible).

## Notes

- **Add overrides only through `shadcn-customize.ts`**, never by hand — `add -a` overwrites `ui/` every run. Add a ts-morph patch (or a guarded string swap for CSS) with an idempotency guard that throws when its target is absent, or extend the `RESTORE` list.
- **Run on a clean tree.** The script `git checkout HEAD --`s the restore set, so uncommitted work there is clobbered; the preflight guard refuses to run on a dirty blast radius for exactly this reason.
- `add -a` re-adds ALL components, so unused ones (`calendar.tsx`, `chart.tsx`, …) reappear every run — expected, don't delete them to chase a dead-code report.
- The root `catalog` is the source of truth for versions; trust it over whatever `@latest` drags in.
- `ts-morph` is a catalog devDep; `shadcn` depends on it too, so it is already a familiar dep in the tree.
