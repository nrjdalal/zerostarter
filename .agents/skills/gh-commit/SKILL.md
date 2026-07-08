---
name: gh-commit
description: Create atomic commits in the conventional format. Use when the user asks to commit or save changes.
---

# Git Commit

ATOMIC commits, conventional format. Stage and commit only; never push unless the user explicitly asks.

## Workflow

### 1. Inspect

```bash
git status --short
git diff
git diff --staged
```

Read staged and unstaged changes before deciding what belongs together.

### 2. Stage

Stage one logical unit per commit (ATOMIC); split unrelated changes into separate commits so every staged file belongs to the same unit.

```bash
git add <paths>
```

### 3. Commit

```bash
git commit -m "<type>(<scope>): <subject>"
```

| Element     | Rule                                                                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**    | `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style`, `build`, `revert`. Type `ci` is RESERVED for pipeline-generated commits and dropped from the changelog (`changelog.config.json`); real CI work uses `fix(ci)`/`feat(ci)`/`docs(ci)`. |
| **Scope**   | Optional area in parentheses (package, component, feature).                                                                                                                             |
| **Subject** | Imperative, lowercase, no period. The commit-msg hook rejects a header over 100 chars or a capitalized subject (`subject-case`).                                                          |
| **Body**    | Optional; explain "why", not "what". Wrap lines at 100 (the hook rejects longer).                                                                                                       |

Never add `Co-authored-by` (repo rule). The commit-msg hook runs commitlint (`@commitlint/config-conventional`); pre-commit runs lint-staged then `bun run build`.

**Examples**:

```
feat(auth): add OAuth provider support
fix(api): prevent duplicate webhook delivery
refactor(web): extract auth middleware into separate module
docs(readme): update installation steps
chore(deps): bump dependencies to latest versions
```

### 4. Push (only when explicitly requested)

Stop after the commit. Push only when the user says "commit and push", "push the changes", or confirms when asked.

## Notes

- Never commit directly to canary (the default branch); branch first, then PR.
- The pre-commit build prints the size table only. Refresh the graph svg manually: `bun .github/scripts/build-sizes.ts --graph`.
