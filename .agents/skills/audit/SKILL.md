---
name: audit
description: Run the dependency security audit and maintain .github/notes/dependencies.md. Use when the canary pre-push audit hook fails, or when `bun audit` flags a high advisory.
---

# Dependency Audit

`bun audit --audit-level high` runs in the pre-push hook on `canary` only (`lefthook.yml`). `.github/notes/dependencies.md` is the canonical record of every active override; it stays even when there are none.

## 1. Run

```bash
bun audit --audit-level high
```

Done when the output is clean or lists the high advisories to resolve.

## 2. Resolve on the highest rung that works

Drop to the next rung only when the one above can't lift the tree:

1. **Update the vulnerable dep** (best): bump its `catalog:` entry in the root `package.json`.
2. **Update the parent** that pins the vulnerable transitive dep.
3. **Override** (last resort): add to `overrides` in the root `package.json`:

   ```json
   "overrides": { "<vulnerable-package>": "<patched-version>" }
   ```

Then `bun i` and confirm nothing broke: `bun run check-types && bun run build`. Done when `bun run check-types && bun run build` pass and `bun audit --audit-level high` reports no high advisories.

## 3. Record in .github/notes/dependencies.md

Match the file's existing shape: one `### <package> → <version>` block per active override under `## Active overrides`, each carrying **Advisory** (link, severity, affected range), **Why an override** (why an update or parent bump can't lift the tree), **Risk**, and **Exit criteria** (when to remove it). Delete a block when its override is dropped. Done when every entry in root `overrides` has a matching block and no block outlives its override.

## 4. Ship

`package.json`/`bun.lock`/`.github/notes/dependencies.md` go through a normal PR.
