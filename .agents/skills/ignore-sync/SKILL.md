---
name: ignore-sync
description: Mirror .gitignore to .dockerignore. Use whenever a .gitignore entry is added or removed, or when auditing a bloated Docker build context.
source: local
---

# Ignore Sync

`.dockerignore` does not inherit from `.gitignore`. Whatever git ignores but `.dockerignore` misses still enters the Docker build context (`COPY . .` in the `prepare` stage of `web/next/Dockerfile` and `api/hono/Dockerfile`), and on this repo that has meant gigabytes: `web/next/.next` alone hit 3GB and `.turbo` 23GB.

## The two files are mirrors

`.gitignore` is the source of truth and `.dockerignore` follows it byte-for-byte. Every ignore rule and every shared `!` un-ignore (e.g. `!.yarn/patches`) lives in the shared body of both: same entry, same section, same order, same commit.

The one sanctioned divergence is the labeled tail at the end of each file, for a git-only or docker-only override. There the label is all that differs, `# git overrides` versus `# docker overrides`, and today each tail carries only `!.env.example`.

## .env stays out of the context

Real `.env*` files never enter the Docker context. Each build mounts the host file as a required BuildKit secret (`--mount=type=secret,id=dotenv,target=/app/.env,required=true`; compose supplies it via `secrets.dotenv.file: .env`), so it is validated in full during the build yet never lands in a layer. A diff that re-includes `.env*` to feed a builder-stage `COPY` is drift; sync it away.

## Audit

```bash
diff -u .gitignore .dockerignore
```

Done when the only difference is the tail label:

```diff
-# git overrides
+# docker overrides
```

Any other differing line is a missed sync.
