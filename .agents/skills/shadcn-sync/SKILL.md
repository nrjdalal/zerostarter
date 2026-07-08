---
name: shadcn-sync
description: Run and reconcile the shadcn component sync (`bun run shadcn:update`). Use when refreshing shadcn components, or when a sync regresses a local customization or breaks the build.
---

# Shadcn Sync

`bun run shadcn:update` regenerates the whole `ui/` layer from the registry, then re-applies every local override programmatically. It is **self-reconciling**: clean tree in, clean tree back. The only diff you should ever see afterwards is **the residual**: a genuine upstream change to a component.

The command is `bash .github/scripts/shadcn-update.sh && bun i`. The script runs, from `web/next`: `rm -rf components.json src/components/ui` -> `shadcn init` -> `shadcn add -a`; then back at repo root: `.github/scripts/shadcn-customize.ts` -> `bun run format` (oxfmt). The trailing `bun i` (the wrapper, not the script) reconciles the lockfile after `customize.ts` restores it from HEAD.

## Procedure

1. **Run** on a clean tree: `bun run shadcn:update`. It refuses on a dirty **blast radius**, so commit or stash first.
2. **Review** `git diff`, expect empty. Every non-empty hunk must be a real registry change to a component, not override churn.
3. **Type-check**: `cd web/next && bun run build` (or `bun run check-types`). Covers every `.tsx`, including unused ones like `calendar.tsx`. Must pass.
4. **Commit** only the residual registry deltas.

## What `shadcn-customize.ts` reconciles

Two strategies. Each guard is idempotent and throws when its target is absent, so an upstream shape change **fails loudly** instead of silently dropping an override.

**Restore from HEAD** (`RESTORE` list), files the sync re-scaffolds but we own outright:

- `bun.lock` + `web/next/package.json`, `add -a` rewrites deps off `catalog:` to pinned ranges; the root `catalog` is the source of truth, so reset to HEAD.
- `web/next/src/app/layout.tsx`, `init` injects `next/font/google`; we self-host instead (see the `fonts` skill).
- `web/next/src/lib/utils.ts`, `init` drops the repo helpers `slugify` and `isActive` (and internal `generateId`).

**Patch in place**, registry components we extend, located by AST shape with ts-morph (attribute/param reordering can't break them) plus one guarded string swap for CSS:

- `button.tsx`, Base UI render wiring (`render`, `nativeButton={!render}`, `render={render}`)
- `spinner.tsx`, `React.ComponentProps<RemixiconComponentType>` typing
- `sidebar.tsx`, optional `children` label on `SidebarTrigger`
- `globals.css`, `--font-sans` repoints at the brand DM Sans variable (`--font-dm-sans`), and both `--sidebar` lines (`:root` + `.dark`) flush to `var(--background)` (PR #566)

`calendar.tsx` carries no override and tracks the registry as-is (we pin `react-day-picker` to `^10`; the registry component is v10-compatible).

## Notes

- **Add overrides only through `shadcn-customize.ts`**, never by hand, `add -a` overwrites `ui/` every run. Extend the `RESTORE` list, or add a fail-loud ts-morph patch (or guarded CSS string swap).
- `add -a` re-adds ALL components, so unused ones (`calendar.tsx`, `chart.tsx`, …) reappear every run. Expected; don't delete them to chase a dead-code report.
