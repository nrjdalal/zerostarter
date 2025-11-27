# The SaaS Starter

A modern, production-ready SaaS starter kit built as a monorepo using **Turborepo**, **Bun**, **Hono**, **Next.js**, and **Drizzle ORM**.

![Architecture](./.github/assets/graph-build.svg)

## 🚀 Tech Stack

- **Monorepo**: [Turborepo](https://turbo.build/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Frontend**: [Next.js 15](https://nextjs.org/) (React 19), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
- **Backend**: [Hono](https://hono.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Environment**: [T3 Env](https://env.t3.gg/) for type-safe environment variables

## 📂 Project Structure

```
.
├── api/
│   └── hono/          # Backend API server (Port 4000)
├── web/
│   └── next/          # Next.js Frontend application (Port 3000)
├── packages/
│   ├── auth/          # Authentication logic & Better Auth configuration
│   ├── db/            # Database schema & Drizzle configuration
│   ├── env/           # Shared environment variable validation
│   └── tsconfig/       # Shared TypeScript configurations
└── package.json       # Root configuration
```

## 🛠️ Getting Started

### Prerequisites

- **Bun** (v1.x) installed.
- **PostgreSQL** database.

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd the-saas-starter
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory based on the required variables (see below) or check `packages/env/src/index.ts`.

   ```bash
   # Example .env
   NODE_ENV="development"

   # Database
   POSTGRES_URL="postgres://user:password@localhost:5432/dbname"

   # Authentication (Better Auth)
   BETTER_AUTH_SECRET="your-secret-key"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"

   # API & App URLs
   HONO_PUBLIC_APP_URL="http://localhost:4000"
   HONO_PUBLIC_ORIGINS="http://localhost:3000"
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

### Database Setup

Push the schema to your database:

```bash
bun run db:push
```

### Running Development Server

Start all applications in development mode:

```bash
bun run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:4000](http://localhost:4000)

## 📜 Scripts

Run these commands from the root directory:

- `bun run dev`: Start development servers for all apps.
- `bun run build`: Build all apps and packages.
- `bun run lint`: Run linters (Oxlint, Prettier).
- `bun run db:generate`: Generate SQL migrations.
- `bun run db:migrate`: Apply migrations to the database.
- `bun run db:push`: Push schema changes directly to the database (prototyping).
- `bun run db:studio`: Open Drizzle Studio to manage data.
- `bun run check-types`: Run TypeScript type checking.

## 🔐 Environment Variables

The project uses `@packages/env` to validate environment variables. Define these in your root `.env` file:

| Variable               | Description                            |
| ---------------------- | -------------------------------------- |
| `POSTGRES_URL`         | Connection string for PostgreSQL       |
| `BETTER_AUTH_SECRET`   | Secret key for Better Auth             |
| `GITHUB_CLIENT_ID`     | GitHub OAuth Client ID                 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret             |
| `HONO_PUBLIC_APP_URL`  | URL where the Hono API is running      |
| `HONO_PUBLIC_ORIGINS`  | Allowed CORS origins (comma-separated) |
| `NEXT_PUBLIC_API_URL`  | API URL for the frontend client        |
| `NEXT_PUBLIC_APP_URL`  | URL of the frontend application        |

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.
