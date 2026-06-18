---
name: ignore-sync
description: Keep .dockerignore in sync with .gitignore. Use whenever an entry is added to or removed from .gitignore, or when auditing why the Docker build context is bloated.
---

# Ignore Sync

`.dockerignore` does not inherit from `.gitignore`. Anything ignored by git but absent from `.dockerignore` still enters the Docker build context (`COPY . .` in the prepare stage), and on this repo that has meant gigabytes: `web/next/.next` hit 3GB and `.turbo` 23GB.

## Rule

Every `.gitignore` addition or removal gets mirrored into `.dockerignore`, same entry, same section, same order. Do both edits in the same commit.

## Structure

The shared body is line-for-line identical in both files and contains zero negations, pure ignore rules only. Every exception (`!` pattern) lives in a labeled platform tail at the end of its file:

```gitignore
# git overrides
!.env.example        # track the example, real .env* stay ignored
```

```gitignore
# docker overrides
!.env.example        # same exception as git; real .env* never enter the context
```

Real `.env*` files stay OUT of the Docker context: every build takes the host file via a required BuildKit secret mount (`--secret id=dotenv,src=.env`; compose wires it from `./.env`), which bypasses the context entirely, is validated in full during the build, and never lands in a layer. The historical inversion (docker re-including `.env*` to feed a builder-stage `COPY`) is gone; if it reappears in a diff, that is drift, sync it away.

## Audit

```bash
diff .gitignore .dockerignore
```

Expected output is exactly the tail labels:

```diff
-# git overrides
+# docker overrides
```

Anything else in the diff is a missing sync; fix it. New entries go in the shared body of BOTH files; new exceptions go under the matching platform tail, never inline in the shared body.
