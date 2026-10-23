---
name: shadcn-sync
description: Run and reconcile the shadcn component sync (`bun run shadcn:update`). Use when refreshing shadcn components, adding or repairing a `ui/` override, or when a sync regresses one or breaks the build.
source: local
---

# Shadcn Sync

`bun run shadcn:update` wipes `web/next/src/components/ui` and `components.json`, re-scaffolds both from the registry (`shadcn init`, then `add -a`), re-applies every override in `.github/scripts/shadcn-customize.ts`, formats, and reinstalls. A clean tree goes in; the only diff out is the residual, a genuine upstream change to a component.

## 1. Run the sync

Run `bun run shadcn:update` on a clean tree: a dirty blast radius exits 1 naming the files, and root `package.json`, which the sync resets, sits outside that check. Done when it exits 0 after a `[shadcn-customize] restored from HEAD:` line and a `[shadcn-customize] patched:` line per patched file in Guards; a throw naming its target and `shape changed`, or ts-morph's `Expected to find function named`, names the guard to repair (step 4).

## 2. Review the diff

Read `git status` and `git diff`. Done when the diff is empty or every hunk is a registry change in what the sync re-scaffolds (`components.json`, `globals.css`, `ui/`, and any file a registry item writes beside them, such as a new `hooks/` or `lib/` helper a component imports, which `git status` lists as untracked); a hunk that drops an override is a guard whose target moved (step 4).

## 3. Type-check

`bunx turbo run check-types --filter=@web/next`, which builds the packages it depends on first and covers every `ui/*.tsx`, used or not. Done when it exits 0; a missing module from the registry's imports is a dependency to add by hand, since the sync resets the three manifests to HEAD: its range in the root `catalog`, and `"<dep>": "catalog:"` in `web/next/package.json`, or nothing installs it.

## 4. Add or repair an override

In `shadcn-customize.ts` only: extend `RESTORE`, or add a shape-keyed ts-morph patch (a guarded string swap for CSS) that throws when its target is absent, then list it under Guards. Done when a second run on the committed tree leaves an empty diff and Guards names the override.

## 5. Commit the residual

Commit with the `gh-commit` skill. Done when the commit holds only the re-scaffolded paths plus any catalog bump.

## Guards

Every override, enumerated only here:

- `RESTORE`, reset to HEAD: `bun.lock`, root `package.json` and `web/next/package.json`, since `add -a` pins `catalog:` specs and adds every registry-declared dependency to the catalog, imported or not; `layout.tsx`, since `init` injects `next/font/google` and the fonts are self-hosted (the `fonts` skill); `utils.ts`, since `init` drops `slugify` and `isActive`.
- `button.tsx`: Base UI `render` wiring, `nativeButton={!render}` and `render={render}` on `ButtonPrimitive`.
- `checkbox.tsx`: indeterminate fills the box and swaps the glyph to a minus.
- `globals.css`: `--font-sans` at the brand sans (`FONT_TO`), and both `--sidebar` lines (`:root`, `.dark`) at `var(--background)`.
- `sidebar.tsx`: optional `children` on `SidebarTrigger`.
- `spinner.tsx`: props typed `React.ComponentProps<RemixiconComponentType>`.

`add -a` re-adds every registry component, so an unused `ui/` file is expected output, left in place.
