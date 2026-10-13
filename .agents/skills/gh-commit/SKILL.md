---
name: gh-commit
description: Create atomic commits in the conventional format. Use when the user asks to commit or save changes.
source: local
---

# Git Commit

Atomic commits in the Conventional Commits format, on the worktree branch. The commit ends the task; a push follows only when the user asks for one.

## 1. Inspect

```bash
git status --short
git diff
git diff --staged
```

Done when every hunk is assigned to a logical unit.

## 2. Stage

```bash
git add <paths>
```

One unit per commit, so unrelated hunks go in separate commits. Done when `git diff --staged` shows exactly one unit.

## 3. Commit

```bash
git commit -m "<type>(<scope>): <subject>"
```

| Element     | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**    | `build`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `style`, `test`: each counts toward the release window's version and changelog, except a non-breaking `chore(deps)`, which changelogen drops, so a dependency refresh is `build(deps)`. `ci` and `revert` count for nothing, so a window holding only those never releases: `changelog.config.json` turns `ci` off for the pipeline's own commits (`ci(changelog)`, `ci(version)`), so real CI work is `fix(ci)`, `feat(ci)` or `docs(ci)`, and changelogen has no `revert` type. |
| **Scope**   | Optional area in parentheses (package, component, feature).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Subject** | Imperative, lowercase, no period; the hook rejects a header over 100 characters or a capitalized subject.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Body**    | Optional, the why rather than the what, wrapped at 100 characters; the hook rejects a longer line.                                                                                                                                                                                                                                                                                                                                                                                                                                             |

The hooks in `lefthook.yml` run on every commit. Examples:

```
feat(auth): add OAuth provider support
fix(api): prevent duplicate webhook delivery
refactor(web): extract auth middleware into separate module
docs(readme): update installation steps
build(deps): bump dependencies to latest versions
```

Done when the commit exits 0 with the hooks green.
