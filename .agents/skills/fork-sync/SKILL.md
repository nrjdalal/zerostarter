---
name: fork-sync
description: Re-baseline a downstream fork on zerostarter's latest scaffold with a gitpick overlay, preserving the fork's product and branding and pruning starter-only artifacts. Use when syncing zerostarter's changes down into a fork or re-baselining a fork.
---

# Fork Sync

Overlay zerostarter's latest scaffold onto a downstream fork without dragging in demo/example/personal artifacts and without clobbering the fork's product or branding. gitpick is an **overlay, not a mirror**: it overwrites shared files and adds source-only files, but never deletes fork-only files. So the fork's product survives by default — the work is restoring the shared files the fork customized, then pruning what the fork doesn't use.

> Do NOT add a `.gitpickignore` (or any always-on source-side exclude) to this repo. zerostarter is a starter people install with gitpick; excluding folders at the source would strip them from a fresh install and ship a broken out-of-the-box template. The exclusion logic lives in this skill and is applied as a prune **after** the overlay, only during a fork re-baseline.

## Procedure — run in a fresh clone of the fork, on a branch off its `canary`

1. **Snapshot the fork's customizations** first: `package.json` (its name/version/URLs), `.infisical.json`, `web/next/vercel.json`, env examples, the auth/console customization, branding (`lib/config.ts` + metadata), and note its product surfaces.
2. **Overlay**: `gitpick <upstream-repo> . -b canary -o`, using a gitpick that overwrites symlinks instead of erroring on them (skill dirs are symlinks). Fork-only files survive.
3. **Restore the fork's customizations** over the overlay: keep zerostarter's **dependency versions** but the fork's **identity** in `package.json`; restore `.infisical.json`, `vercel.json`, env examples, console auth, branding, and product wiring (home widget, API router mounts, nav). gitpick also clobbers shared tooling the fork customized — `git checkout origin/canary -- docker-compose.yml .github/scripts .github/rulesets` restores those.
4. **Restore fork-owned trees** the overlay clobbered (the fork owns these wholesale):
   - `git checkout origin/canary -- web/next/content` — the fork's blog + docs (ensure ≥1 sample post and doc remain as format anchors).
   - `git checkout origin/canary -- web/next/src/fonts` — the fork's font loader + font files. Note this does NOT delete extra upstream font files the overlay added; the dynamic prune (step 6) removes those once the loader points back at the fork's fonts.
5. **Delete starter-only files** the fork has no use for: `web/next/src/app/{hire,resume}/` (personal routes), `.github/reviews/` (repo-internal), and the per-repo dependency-graph svgs (`web/next/public/graph-build.svg`, `.github/assets/graph-build.svg` — the fork's CI regenerates its own).
6. **Dynamic prune by reference** — the authoritative pass for assets. Delete any file under `web/next/public/` or `web/next/src/fonts/` that nothing references; this removes demo assets (`public/landing`, the create-next-app svgs) and the orphaned upstream fonts, while KEEPING referenced assets (e.g. an OG image the layout serves) — a static path list would wrongly strip those.
   ```bash
   for f in $(find web/next/public web/next/src/fonts -type f); do
     grep -rqF "$(basename "$f")" web/next/src web/next/content 2>/dev/null || git rm -q "$f"
   done
   ```
7. **Verify**: `bun install`; `SKIP_ENV_VALIDATION=true bun run build`; brand-scan the diff for leaked upstream branding (only legitimate upstream-sync references should remain); confirm the fork's preview deploys build. Preview env values must come from the fork's validated `canary` scope, not a placeholder dev env, or `@packages/*` env validation fails the real preview build.
8. Commit (conventional, no Co-authored-by), push, open a PR to the fork's `canary`. Do not merge without review. Merge with a **squash** commit (not a merge commit), so canary stays one commit per PR and shared-history merge commits stay reserved for release PRs (canary→main).
