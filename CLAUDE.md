# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun install          # Install dependencies
bun dev              # Start all apps (Next.js + Hono) with Turborepo TUI

# Database
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio

# Build & Quality
bun run build        # Build all packages/apps
bun run check-types  # TypeScript type checking
bun run lint         # Run oxlint across all packages
bun run format       # Format with oxfmt
bun run format:check # Check formatting

# Individual apps
bun --cwd api/hono dev   # Run Hono API only
bun --cwd web/next dev   # Run Next.js only
```

## Architecture

**Monorepo with Turborepo** using Bun as runtime and package manager.

### Apps

- `api/hono` - Hono backend API server (port 4000), exports `AppType` for RPC client
- `web/next` - Next.js 16 frontend (port 3000)

### Packages

- `@packages/auth` - Better Auth configuration with GitHub/Google OAuth
- `@packages/db` - Drizzle ORM schema and PostgreSQL connection (Bun SQL driver)
- `@packages/env` - Type-safe environment variables with `@t3-oss/env-core`, exports per-app envs (`env/api-hono`, `env/auth`, `env/db`, `env/web-next`)
- `@packages/tsconfig` - Shared TypeScript configs

### Type-Safe API Pattern

Backend routes in `api/hono/src/routers/` are exported as `AppType`. Frontend imports this type and uses `hono/client` for fully typed requests:

```ts
import { apiClient } from "@/lib/api/client"
const res = await apiClient.health.$get()
const { data } = await res.json()
```

### Database Schema

Schema files in `packages/db/src/schema/`. Currently includes Better Auth tables (user, session, account, verification).

### Route Groups (Next.js)

- `(content)` - Docs and blog pages (Fumadocs)
- `(protected)` - Authenticated routes (dashboard)
- `(llms.txt)` - AI/LLM documentation endpoints

## Code Style

- Use `@/` for imports
- Minimal comments—only when absolutely necessary
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `perf:`, `style:`, `ci:`

## Git Hooks (Lefthook)

Pre-commit runs: `bun audit` (on canary branch), `lint-staged`, and `build`.
Commit messages validated with commitlint (conventional format required).
