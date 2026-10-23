---
name: ignore-sync
description: Mirror .gitignore to .dockerignore. Use whenever a .gitignore entry is added or removed, or when auditing a bloated Docker build context.
source: local
---

# Ignore Sync

`.dockerignore` does not inherit from `.gitignore`. Whatever git ignores but `.dockerignore` misses still enters the Docker build context (`COPY . .` in the `prepare` stage of both Dockerfiles), build caches included, which is how a context grows to gigabytes.

The two files also read the same line differently: git matches an unanchored entry (`node_modules/`, `.env*`) at any depth, Docker only at the root of the context. So the mirror excludes the root copy alone, and a nested one (any workspace's `node_modules/`, `web/next/.next/`, `packages/*/dist/`, a `.env*` below the root) enters the context. So do `.git` and `.claude/worktrees/`, which neither file lists, so a build from a checkout that holds worktrees sends every one of them.

## The two files are mirrors

`.gitignore` is the source of truth and `.dockerignore` follows it byte-for-byte. Every ignore rule and every `!` un-ignore that narrows one (`!.yarn/patches`) lives in the shared body of both: same entry, same section, same order, same commit.

The one sanctioned divergence is the labeled tail at the end of each file (`# git overrides` versus `# docker overrides`), where a tool's own override goes; `!.env.example` sits in both tails, so the example reaches git and the build context while the root `.env*` files stay out of both, and the label is all that differs.

## The root .env stays out of the context

The build reads `.env` as a BuildKit secret (the Dockerfiles and compose wire it), so it is validated in full during the build, and as the code stands neither image carries it. The web image stays that way only while nothing Next traces into its server output (a page, layout, route handler or server action under `web/next/src`, or a module one of them imports) reaches `@packages/env/load-dotenv`, directly or through `@packages/env/{api-hono,auth,db}`, `@packages/db` or `@packages/auth` (its `access` entry imports nothing): Next's tracer follows the loader's `path.resolve(process.cwd(), "../../.env")` to the mounted secret and copies it to `.next/standalone/.env`, which the runner stage ships as `/app/.env`. `web/next/next.config.ts` imports the loader on purpose, above the `web-next` import that validates env as it loads, and that import stays: Next writes the resolved config into the standalone `server.js` rather than tracing the config file's imports. After a web build, `web/next/.next/standalone/.env` does not exist. A diff that re-includes `.env*` to feed a builder-stage `COPY` is drift; sync it away.

## Audit

```bash
diff -u .gitignore .dockerignore
git ls-files --others --ignored --exclude-standard --directory | grep '/.'
```

The second command lists what git ignores below the root, which Docker still sends unless `.dockerignore` spells the path from the root, as its `custom files` section does for the generated `meta.json` files. Done when the diff shows only the tail label:

```diff
-# git overrides
+# docker overrides
```

Any other differing line is a missed sync. Before a build, a `.env*` file or `.claude/worktrees/` in the second list enters the context with its secrets, so build from a checkout without them (a worktree holds no worktrees of its own); build output and `node_modules` in it enter as weight the mirror cannot remove.
