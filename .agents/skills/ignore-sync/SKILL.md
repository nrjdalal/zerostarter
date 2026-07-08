---
name: ignore-sync
description: Mirror .gitignore to .dockerignore. Use whenever a .gitignore entry is added or removed, or when auditing a bloated Docker build context.
---

# Ignore Sync

`.dockerignore` does not inherit from `.gitignore`. Anything git ignores but `.dockerignore` misses still enters the Docker build context (`COPY . .` in the `prepare` stage of `web/next/Dockerfile` and `api/hono/Dockerfile`), and on this repo that has meant gigabytes: `web/next/.next` alone hit 3GB, `.turbo` 23GB.

## Rule: the files are MIRRORS

`.gitignore` is the source of truth; `.dockerignore` follows it. The two files are byte-identical except one line: the platform-tail label (`# git overrides` vs `# docker overrides`). Every ignore rule AND every shared `!` un-ignore (e.g. `!.yarn/patches`) lives in the shared body: same entry, same section, same order, in both files, in the same commit.

The one sanctioned divergence is the labeled platform tail at the end of each file, for a git-only or docker-only override. Today both tails carry only `!.env.example` under their respective label.

## .env stays out of the context

Real `.env*` files never enter the Docker context. Each build mounts the host file as a required BuildKit secret (`--mount=type=secret,id=dotenv,target=/app/.env,required=true`; compose supplies it via `secrets.dotenv.file: .env`), so it bypasses the context, is validated in full during the build, and never lands in a layer. If a diff re-includes `.env*` to feed a builder-stage `COPY`, that is drift; sync it away.

## Audit

```bash
diff -u .gitignore .dockerignore
```

Done when the ONLY difference is the tail label:

```diff
-# git overrides
+# docker overrides
```

Any other line is a missing sync.
