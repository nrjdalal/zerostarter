# The SaaS Starter Monorepo

Welcome to the SaaS Starter monorepo! This project is a full-stack application built with modern web technologies, organized as a monorepo using [Turborepo](https://turbo.build/).

![Architecture](./.github/assets/graph-build.svg)

## Tech Stack

### Core

- **Package Manager:** [Bun](https://bun.sh/) (using `catalog` for consistent dependency management)
- **Monorepo Tool:** [Turborepo](https://turbo.build/)
- **Language:** TypeScript
- **Linting:** [Oxlint](https://oxc.rs/docs/guide/usage/linter)

### Backend (`api/hono`)

- **Framework:** [Hono](https://hono.dev/)
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Authentication:** [Better Auth](https://better-auth.com/)
- **Email:** [Resend](https://resend.com/)
- **Validation:** Zod

### Frontend (`web/next`)

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI, Lucide React, Sonner
- **State/Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod + TanStack Form (dependency present)
- **Themes:** next-themes

## Prerequisites

- **Bun**: You need to have Bun installed.
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **PostgreSQL**: Ensure you have a running PostgreSQL instance.

## Getting Started

### 1. Installation

Clone the repository and install dependencies using Bun:

```bash
git clone <repository-url>
cd the-saas-starter
bun install
```

### 2. Environment Variables

You need to configure environment variables for both the API and the Web application.

**Backend (`api/hono/.env`):**

Create a `.env` file in `api/hono/` with the following:

```env
# App Settings
HONO_PUBLIC_APP_URL="http://localhost:4000"
HONO_PUBLIC_ORIGINS="http://localhost:3000"

# Better Auth
BETTER_AUTH_SECRET="your_better_auth_secret"

# OAuth Providers
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Database
POSTGRES_URL="postgresql://user:password@localhost:5432/dbname"
```

**Frontend (`web/next/.env.local`):**

Create a `.env.local` file in `web/next/` with the following:

```env
# App Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 3. Database Setup

Navigate to the API directory and push the schema to your database:

```bash
cd api/hono
bunx drizzle-kit push
```

### 4. Running the Application

From the root directory, run the development server:

```bash
bun run dev
```

This will start both the backend and frontend servers in parallel using Turborepo.

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:4000](http://localhost:4000)
- **Backend Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

## Project Structure

```
.
├── api/
│   └── hono/                # Hono server
│       ├── src/
│       │   ├── db/          # Database schema (Drizzle)
│       │   ├── lib/         # Shared libraries (Auth, etc.)
│       │   ├── middlewares/ # Hono middlewares
│       │   ├── routers/     # API route definitions
│       │   └── index.ts     # Server entry point
├── web/
│   └── next/                # Next.js client
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # UI Components
│       │   ├── hooks/       # Custom React hooks
│       │   └── lib/         # API clients and utils
├── packages/
│   └── tsconfig/             # Shared TypeScript configurations
├── turbo.json               # Turborepo configuration
└── package.json             # Root dependencies and scripts
```

## Development Workflow

### Scripts

Run these commands from the root directory:

- **Install Dependencies:**

  ```bash
  bun install
  ```

- **Start Development Server:**

  ```bash
  bun run dev
  ```

- **Linting:**

  ```bash
  bun run lint
  ```

- **Type Checking:**

  ```bash
  bun run check-types
  ```

- **Build:**

  ```bash
  bun run build
  ```

- **Clean:** (Removes `node_modules`, `.next`, `dist`, `.turbo`)
  ```bash
  bun run clean
  ```

### Managing Dependencies

This monorepo uses `bun` workspaces. To add a dependency to a specific workspace:

```bash
# Add to api
bun add <package> --filter @api/hono

# Add to web
bun add <package> --filter @web/next
```

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and pull request to `main`. It checks:

- **Linting:** `bun run lint`
- **Type Checking:** `bun run check-types`
- **Build:** `bun run build`

## API Integration

The frontend communicates with the backend using Hono's RPC client, providing end-to-end type safety.

- The API client is initialized in `web/next/src/lib/api/client.ts`.
- Types are inferred directly from the `@api/hono` workspace exports.
