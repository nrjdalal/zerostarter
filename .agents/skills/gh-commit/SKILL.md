---
name: gh-commit
description: Create atomic commits with conventional commit format. Use when the user asks to commit, save changes, or create a commit.
---

# Git Commit

Creates atomic commits with the conventional message format. Stages and commits, **does not push** unless the user explicitly asks.

## Workflow

### 1. Inspect Changes

```bash
git status --short
git diff
git diff --staged
```

Review both staged and unstaged changes before deciding what belongs together.

### 2. Stage Changes

Stage related changes together, one logical unit per commit. Split unrelated changes into separate commits.

```bash
git add <paths>
```

### 3. Commit

```bash
git commit -m "<type>(<scope>): <subject>"
```

| Element     | Rule                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| **Type**    | `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style` preferred; `build`, `revert` also accepted. Type `ci` is RESERVED for pipeline-generated commits and is filtered out of changelog sections; real CI work uses `fix(ci)`/`feat(ci)`/`docs(ci)` |
| **Scope**   | Optional area in parentheses (package, component, feature name)           |
| **Subject** | Imperative mood, lowercase, no period, ≤80 chars preferred (hook enforces ≤100) |
| **Body**    | Optional; explain "why" not "what"; wrap at 80 chars                      |

Never include `Co-authored-by` (repo rule). Commitlint enforces the conventional format via the commit-msg hook; pre-commit runs build + lint-staged.

**Examples**:

```
feat(auth): add OAuth provider support
fix(api): prevent duplicate webhook delivery
refactor(web): extract auth middleware into separate module
docs(readme): update installation steps
chore(deps): bump dependencies to latest versions
```

### 4. Push (only when explicitly requested)

Do **not** push automatically. Push only when the user says "commit and push", "push the changes", or confirms when asked. Plain "commit"/"save changes" stops after the commit.

## Notes

- Never commit directly to canary; work on a feature branch and PR (see AGENTS.md)
- The pre-commit build prints the size table only; refresh the graph svg manually with `bun .github/scripts/build-sizes.ts --graph`
