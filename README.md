# Cafe

Cafe, your smart companion for tables.

**Live**: [cafe.dalonic.com](https://cafe.dalonic.com) · API: [api.cafe.dalonic.com/api/docs](https://api.cafe.dalonic.com/api/docs)

## ⚙️ Architecture and Tech Stack

![Build Graph](./.github/assets/graph-build.svg)

- **Runtime & Build System**: [Bun](https://bun.sh) + [Turborepo](https://turbo.build)
- **Frontend**: [Next.js 16](https://nextjs.org)
- **Backend**: [Hono](https://hono.dev)
- **RPC**: [Hono Client](https://hono.dev/docs/guides/rpc) for end-to-end type safety with frontend client
- **Database**: [PostgreSQL](https://www.postgresql.org) with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com) with OAuth (GitHub, Google), magic links, organizations, and teams
- **Analytics**: [PostHog](https://posthog.com) for product analytics, feature flags, and session recordings
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Validation**: [Zod](https://zod.dev)
- **Bundling, Linting & Formatting**: [tsdown](https://tsdown.dev), [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- **API Documentation**: [Scalar](https://scalar.com) with auto-generated OpenAPI spec at `/api/docs`
- **Documentation**: [Fumadocs](https://fumadocs.dev)

This project is a monorepo organized as follows:

```
.
├── api/
│   └── hono/      # Backend API server (Hono)
├── web/
│   └── next/      # Frontend application (Next.js)
└── packages/
    ├── auth/      # Shared authentication logic (Better Auth)
    ├── db/        # Database schema and Drizzle configuration
    ├── env/       # Type-safe environment variables
    └── tsconfig/  # Shared TypeScript configuration
```

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Set up database
bun run db:generate
bun run db:migrate

# Start development
bun dev
```

## 📊 Web Vitals

Measured locally with `agent-browser vitals` (dev server, warm), bucketed to 100ms bands so the table only changes when something real does. Updated whenever a public page changes, see AGENTS.md.

| Page    | TTFB   | FCP    | LCP    | CLS | LCP element |
| ------- | ------ | ------ | ------ | --- | ----------- |
| `/`     | <100ms | <200ms | <200ms | 0   | `h1`        |
| `/docs` | <100ms | <200ms | <200ms | 0   | `p`         |
| `/blog` | <100ms | <100ms | <100ms | 0   | `li`        |

Last measured: 2026-06-06. Fonts are self-hosted via `next/font/local` (vendored latin woff2, hashed URLs, size-adjusted fallback metrics), closing the font item previously tracked on the [Plane board](https://app.plane.so/dalonic/projects/ed8e5d8c-b356-4f67-91d8-9c31308389ad/issues/).

## 📄 License

MIT License, see [LICENSE.md](LICENSE.md) for details.
