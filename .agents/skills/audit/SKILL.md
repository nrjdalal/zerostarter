---
name: audit
description: Run the dependency security audit and maintain .github/notes/dependencies.md. Use when the canary pre-push audit hook fails, or when `bun audit` flags a high advisory.
source: local
---

# Dependency Audit

The pre-push hook runs `bun audit --audit-level high`, on `canary` only (`lefthook.yml`). `.github/notes/dependencies.md` is the canonical record of every active override, and it stays in place even when there are none.

## 1. Run

```bash
bun audit --audit-level high
```

Done when the output is clean, or you have the list of high advisories to clear.

## 2. Fix on the highest rung that works

Fix each advisory on the highest rung that lifts the whole tree; drop a rung only when the one above cannot:

1. **Update the vulnerable dependency** (best): bump its `catalog:` entry in the root `package.json`.
2. **Update the parent** that pins the vulnerable transitive dependency.
3. **Override** (last resort): pin the patched version in root `overrides`:

   ```json
   "overrides": { "<vulnerable-package>": "<patched-version>" }
   ```

`bun audit fix` applies the first two rungs mechanically when a patched version exists within the ranges parents allow; `--dry-run` previews and `--latest` also crosses majors, so review what it picks before accepting. Read the advisory's affected ranges before reaching for a lower rung: the audit header lists every installed version of the package, not only the vulnerable ones. Follow with `bun dedupe` to collapse duplicate versions the tree accumulated.

Then `bun i` and prove nothing broke. Done when `bun run check-types && bun run build` pass and `bun audit --audit-level high` reports no high advisories.

## 3. Record every override

Every entry in root `overrides` needs a matching block in `.github/notes/dependencies.md`, in the file's existing shape: one `### <package> → <version>` under `## Active overrides`, carrying **Advisory** (link, severity, affected range), **Why an override** (why an update or parent bump can't lift the tree), **Risk**, and **Exit criteria** (when to remove it). Delete a block when its override goes. Done when every override has a block and no block outlives its override.

## 4. Ship

`package.json`, `bun.lock`, and `.github/notes/dependencies.md` go through a normal PR.
