# The SaaS Starter Monorepo

Welcome to the SaaS Starter monorepo! This project is a full-stack application built with modern web technologies, organized as a monorepo using [Turborepo](https://turbo.build/).

## Tech Stack

### Core

- **Package Manager:** [Bun](https://bun.sh/)
- **Monorepo Tool:** [Turborepo](https://turbo.build/)
- **Language:** TypeScript

### Backend (`apps/api` or `api/hono`)

- **Framework:** [Hono](https://hono.dev/)
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database:** PostgreSQL
- **Authentication:** [Better Auth](https://better-auth.com/)
- **Email:** [Resend](https://resend.com/)
- **Validation:** Zod

### Frontend (`apps/web` or `web/next`)

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI, Lucide React, Sonner
- **State/Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod

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
# Database
POSTGRES_URL="postgresql://user:password@localhost:5432/dbname"

# App Settings
HONO_PUBLIC_APP_URL="http://localhost:4000"
HONO_PUBLIC_ORIGINS="http://localhost:3000"

# Auth Providers (Example: GitHub)
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Email
RESEND_API_KEY="re_..."
```

**Frontend (`web/next/.env.local`):**

Create a `.env.local` file in `web/next/` with the following:

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
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

## Project Structure

```
.
├── api/
│   └── hono/          # Hono API server
│       ├── src/
│       │   ├── db/    # Database schema and connection
│       │   ├── lib/   # Shared libraries (Auth, etc.)
│       │   └── index.ts # Server entry point
├── web/
│   └── next/          # Next.js Frontend application
│       ├── src/
│       │   ├── app/   # App Router pages
│       │   ├── components/ # UI Components
│       │   └── lib/   # API clients and utils
├── turbo.json         # Turborepo configuration
└── package.json       # Root dependencies and scripts
```

## Development Workflow

- **Add a dependency:**

  ```bash
  # Add to api
  bun add <package> --filter @api/hono

  # Add to web
  bun add <package> --filter @web/next
  ```

- **Linting:**

  ```bash
  bun run lint
  ```

- **Build:**
  ```bash
  bun run build
  ```

## API Integration

The frontend communicates with the backend using Hono's RPC client. This provides end-to-end type safety.

- The API client is initialized in `web/next/src/lib/api/client.ts`.
- Types are shared directly from the `@api/hono` workspace.
