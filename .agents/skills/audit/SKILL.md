---
name: audit
description: Run the dependency security audit and maintain AUDIT.md. Use when the user asks to audit dependencies, when the pre-push audit hook fails on canary, or when bun audit reports vulnerabilities.
---

# Dependency Audit

`bun audit --audit-level high` runs in the pre-push hook on canary (`lefthook.yml`). `AUDIT.md` at the repo root is the canonical record of overrides/exceptions, it intentionally exists even when empty of them. Never delete it.

## Workflow

### 1. Run the audit

```bash
bun audit --audit-level high
```

### 2. Resolve, in order of preference

1. **Update the vulnerable dependency** (best): bump its catalog entry in the root `package.json`, then `bun i`. Check nothing breaks: `bun run check-types && bun run build`
2. **Update the parent** that pins the vulnerable transitive dep
3. **Override** (last resort): add to root `package.json`

```json
"overrides": {
  "<vulnerable-package>": "<patched-version>"
}
```

### 3. Record the outcome in AUDIT.md

- Resolved by updates: keep/update the "No overrides required" line
- Override added: record the package, the CVE/advisory link, why an update was not possible, and a revisit condition

```markdown
## Overrides

| Package | Advisory | Why | Revisit when |
| --- | --- | --- | --- |
| example@1.2.3 → 1.2.4 | GHSA-xxxx | parent pins <1.3, no compatible update | parent releases v2 |
```

### 4. Ship

Changes to `package.json`/`bun.lock`/`AUDIT.md` go through a normal PR. The pre-push audit on canary will then pass by construction.
