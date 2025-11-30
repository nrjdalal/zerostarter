# ZeroStarter

A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture.

<!--
```bash
npx turbo run build --graph=graph.svg
sed -i '' 's/\[root\] //g; s/#build//g; s/___ROOT___/zerostarter/g' graph.svg
mkdir -p .github/assets
mv graph.svg .github/assets/graph-build.svg
```
-->

![Graph Build](./.github/assets/graph-build.svg)

---

## 🚀 Tech Stack

- **Runtime & Build System**: [Bun](https://bun.sh) + [Turborepo](https://turbo.build)
- **Frontend**: [Next.js 15](https://nextjs.org)
- **Backend**: [Hono](https://hono.dev)
- **RPC**: [Hono Client](https://hono.dev/docs/guides/rpc) for end-to-end type safety with frontend client
- **Database**: [PostgreSQL](https://www.postgresql.org) with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Validation**: [Zod](https://zod.dev)
- **Linting & Formatting**: [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [Prettier](https://prettier.io)

### Future Stack and Features

- **Analytics**:
  - [ ] [Posthog](https://posthog.com)
- **Documentation**:
  - [ ] [Fumadocs](https://fumadocs.dev)
  - [ ] [Scalar](https://scalar.com)
- **Internationalization**:
  - [ ] [i18next](https://www.i18next.com)
  - [ ] [next-intl](https://next-intl.dev)
- **Payment Processing**:
  - [ ] [Autumn](https://useautumn.com)
  - [ ] [Dodo](https://dodopayments.com)
  - [ ] [Polar](https://polar.sh)
  - [ ] [Stripe](https://stripe.com)

---

## 📂 Project Structure

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

---

## 🔌 Type-Safe API Client

This starter utilizes [Hono RPC](https://hono.dev/docs/guides/rpc) to provide end-to-end type safety between the backend and frontend.

- **Backend**: Routes defined in `api/hono/src/routers` are exported as `AppType` at `api/hono/src/index.ts`.
- **Frontend**: The client at `web/next/src/lib/api/client.ts` infers `AppType` request/response types using `hono/client`.

### Usage Example

```ts
import { apiClient } from "@/lib/api/client"

// Fully typed request and response
const res = await apiClient.v1.hello.$get()
const data = await res.json()
```

---

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3.0 or later)

### Installation

1. Clone this template:

   ```bash
   bunx gitpick https://github.com/nrjdalal/zerostarter
   cd zerostarter
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   Create a `.env` file in the root directory with the following variables:

   ```env
   # -------------------- Server variables --------------------

   HONO_APP_URL=http://localhost:4000
   HONO_TRUSTED_ORIGINS=http://localhost:3000

   # Generate using `openssl rand -base64 32`
   BETTER_AUTH_SECRET=

   # Generate at `https://github.com/settings/developers`
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=

   # Generate using `bunx pglaunch -k`
   POSTGRES_URL=

   # -------------------- Client variables --------------------

   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Database Setup

1. Ensure your PostgreSQL server is running.
2. Push the schema to the database:

   ```bash
   bun run db:push
   ```

### 🔐 Authentication Setup

This starter uses [Better Auth](https://better-auth.com) with GitHub as the provider.

1. Create a GitHub OAuth App at [GitHub Developer Settings](https://github.com/settings/developers).
2. Set the **Homepage URL** to `http://localhost:3000`.
3. Set the **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
4. Copy the **Client ID** and **Client Secret** into your `.env` file.

### Running the Application

Start the development servers:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:4000](http://localhost:4000)

  ```bash
  bun dev
  ```

---

## 📜 Scripts

- `bun run dev`: Start the development servers.
- `bun run clean`: Clean the cache and build artifacts.
- `bun run check-types`: Check the types of the codebase.
- `bun run build`: Build the applications.
- `bun run lint`: Lint the codebase using Oxlint.
- `bun run format`: Format the codebase using Prettier.
- `bun run start`: Start the production servers.
- `bun run db:generate`: Generate Drizzle migrations.
- `bun run db:migrate`: Run Drizzle migrations.
- `bun run db:push`: Push schema changes directly to the database.
- `bun run db:studio`: Open Drizzle Studio to view/edit data.

## 📖 Deployment

- **Frontend**:
  - [Vercel](./.github/docs/deployment.md#vercel)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
