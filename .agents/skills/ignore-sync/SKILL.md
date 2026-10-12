---
name: ignore-sync
description: Mirror .gitignore to .dockerignore. Use whenever a .gitignore entry is added or removed, or when auditing a bloated Docker build context.
source: local
---

# Ignore Sync

`.dockerignore` does not inherit from `.gitignore`. Whatever git ignores but `.dockerignore` misses still enters the Docker build context (`COPY . .` in the `prepare` stage of both Dockerfiles), build caches included, which is how a context grows to gigabytes.

## The two files are mirrors

`.gitignore` is the source of truth and `.dockerignore` follows it byte-for-byte. Every ignore rule and every `!` un-ignore that narrows one (`!.yarn/patches`) lives in the shared body of both: same entry, same section, same order, same commit.

The one sanctioned divergence is the labeled tail at the end of each file (`# git overrides` versus `# docker overrides`), where a tool's own override goes; `!.env.example` sits in both tails, so the example reaches git and the build context while `.env*` stays out of both, and the label is all that differs.

## .env stays out of the context

The build reads `.env` as a BuildKit secret (the Dockerfiles and compose wire it), so it is validated in full during the build and never lands in a layer. A diff that re-includes `.env*` to feed a builder-stage `COPY` is drift; sync it away.

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
