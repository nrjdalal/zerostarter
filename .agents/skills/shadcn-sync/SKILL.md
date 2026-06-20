---
name: shadcn-sync
description: Run and reconcile the shadcn component sync (`bun run shadcn:update`). Use when refreshing shadcn components, or when a sync regresses a local customization or breaks the build.
---

# Shadcn Sync

`bun run shadcn:update` regenerates the whole shadcn layer from the registry: it wipes `web/next/src/components/ui` + `components.json`, re-inits, re-adds every component, re-applies our local extensions via `.github/scripts/shadcn-customize.ts`, formats, and runs the postinstall. It overwrites tracked files indiscriminately, so its output is never safe to commit as-is. The script only regenerates; you reconcile.

## Procedure

Run on a clean tree, then work the diff:

1. **Sync** — `bun run shadcn:update`.
2. **Review the diff** (`git diff`) before discarding anything. This is where you catch a genuine upstream improvement (keep it) or a breaking change (handle it) instead of throwing it away blind.
3. **Discard what the sync should not own** (`git checkout -- <path>`):
   - `bun.lock` + `web/next/package.json` — `shadcn add` force-adds `react-day-picker@latest`, a major past the catalog's `^9` pin; it drifts the lockfile and breaks the v9-era `calendar.tsx`. After restoring, `rm -rf node_modules/react-day-picker web/next/node_modules/react-day-picker && bun install` to resync (a plain `bun install` won't downgrade it).
   - `web/next/src/lib/utils.ts` — init drops the repo helpers (`slugify`, imported by `org-switcher`; `generateId`).
   - `web/next/src/app/layout.tsx` and the `--font-sans` line in `web/next/src/app/globals.css` — init re-injects `next/font/google`, undoing the localized fonts (see the `fonts` skill).
4. **Restore overridden parts** in components the registry overwrote — keep any real registry improvement, but put our override back:
   - `button.tsx` — the Base UI render wiring: `render`, `nativeButton={!render}`, `render={render}`.
   - `spinner.tsx` — `React.ComponentProps<RemixiconComponentType>` typing (registry retypes it to `"svg"`).
5. **Build** — `cd web/next && bun run build`. The type-check covers every `.tsx`, including dead ones like `calendar.tsx`.
6. **Commit** only the genuine registry deltas.

## Notes

- `add -a` re-adds ALL components, so unused ones (`calendar.tsx`, `chart.tsx`, ...) reappear every run. Expected — don't delete them to chase a dead-code report.
- If the postinstall throws `ReferenceError` from `.github/scripts/deps-manager.ts`, the catalog rewrite is broken and takes the sync down; that script must write to its loop variable.
- The root `catalog` is the source of truth for versions; trust it over whatever `@latest` drags into the lockfile.
- `.github/scripts/shadcn-customize.ts` re-applies our local extensions after `add -a` (currently: `SidebarTrigger` gains an optional `children` label, derived from the freshly-synced source). It's idempotent and asserts each transform, so a shadcn shape change fails the sync loudly instead of silently dropping the extension. Expect the `SidebarTrigger` `children` delta in the diff and keep it; never hand-edit `ui/sidebar.tsx` to add it.
