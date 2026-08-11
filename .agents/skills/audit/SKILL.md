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

Then `bun i` and prove nothing broke. Done when `bun run check-types && bun run build` pass and `bun audit --audit-level high` reports no high advisories.

## 3. Record every override

Every entry in root `overrides` needs a matching block in `.github/notes/dependencies.md`, in the file's existing shape: one `### <package> → <version>` under `## Active overrides`, carrying **Advisory** (link, severity, affected range), **Why an override** (why an update or parent bump can't lift the tree), **Risk**, and **Exit criteria** (when to remove it). Move a block to `## Retired overrides` when its override goes, keeping the record so a returning advisory is recognised rather than re-investigated; a retired block drops the `→ <version>` arrow, since there is no version left to record. Done when every active override has a block under `## Active overrides`, and nothing there outlives its override.

Before reaching for a bare `"overrides": { "<pkg>": "<version>" }`, check whether the package is also a direct dependency of a workspace, and at which major: Bun applies a bare override to every copy in the tree, so one written for a transitive copy will silently downgrade the app's own. `nanoid` under `## Retired overrides` is the worked example. A nested `"<parent>": { "<pkg>": "..." }` is not the escape hatch either: Bun does not record it, and it resolves nothing.

## 4. Ship

`package.json`, `bun.lock`, and `.github/notes/dependencies.md` go through a normal PR.
