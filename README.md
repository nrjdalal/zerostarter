# ZeroStarter - The SaaS Starter

A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture.

- **📚 Documentation**: For comprehensive documentation, visit **[https://zerostarter.dev/docs](https://zerostarter.dev/docs)**.
- **🤖 AI/LLM Users**: For optimized documentation, use **[https://zerostarter.dev/llms.txt](https://zerostarter.dev/llms.txt)**.
- **🐦 X**: Follow **[@nrjdalal](https://twitter.com/nrjdalal)** for updates and don't forget to star the repository!

> [!IMPORTANT]
> **Release Candidate (RC) Status**: ZeroStarter is currently in **Release Candidate (RC)** status. All implemented features are stable and production-ready. We're actively adding new features and integrations day-by-day.

<!--
```bash
npx turbo run build --graph=graph.svg
sed -i '' 's/\[root\] //g; s/#build//g; s/___ROOT___/ZeroStarter/g' graph.svg
sed -i '' 's/fill="white"/fill="none"/g; s/fill="#ffffff"/fill="none"/g; s/fill="#fff"/fill="none"/g' graph.svg
sed -i '' 's/fill="black"/fill="#1f6feb"/g' graph.svg
sed -i '' 's/stroke="[^"]*"/stroke="#1f6feb"/g; s/stroke:[^;]*;/stroke:#1f6feb;/g' graph.svg
sed -i '' 's/<text\([^>]*\)>/<text\1 fill="#1f6feb">/g' graph.svg
sed -i '' 's/stroke="#1f6feb" points="-4,4/stroke="none" points="-4,4/g' graph.svg
mkdir -p .github/assets
mv graph.svg .github/assets/graph-build.svg
```
-->

## Architecture and Tech Stack

![Graph Build](./.github/assets/graph-build.svg)

- **Runtime & Build System**: [Bun](https://bun.sh) + [Turborepo](https://turbo.build)
- **Frontend**: [Next.js 16](https://nextjs.org)
- **Backend**: [Hono](https://hono.dev)
- **RPC**: [Hono Client](https://hono.dev/docs/guides/rpc) for end-to-end type safety with frontend client
- **Database**: [PostgreSQL](https://www.postgresql.org) with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Validation**: [Zod](https://zod.dev)
- **Bundling, Linting & Formatting**: [tsdown](https://tsdown.dev), [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Prettier](https://prettier.io)
- **Documentation**: [Fumadocs](https://fumadocs.dev) with auto-generated [llms.txt](https://zerostarter.dev/llms.txt)
- **Automated Releases**: Automatically updated [Changelog](https://github.com/nrjdalal/zerostarter/releases) on release

### Future Stack and Features

- **AI**
  - [ ] [Vercel AI SDK](https://ai-sdk.dev)
- **Analytics**:
  - [ ] [Posthog](https://posthog.com)
- **Background Tasks**:
  - [ ] [Inngest](https://www.inngest.com)
  - [ ] [Trigger.dev](https://trigger.dev)
- **Email**:
  - [ ] [Resend](https://resend.com)
  - [ ] [SendGrid](https://sendgrid.com)
- **OpenAPI**:
  - [ ] [Scalar](https://scalar.com)
- **Organization/teams**:
  - [ ] [Better Auth](https://www.better-auth.com/docs/plugins/organization)
- **Internationalization**:
  - [ ] [i18next](https://www.i18next.com)
  - [ ] [next-intl](https://next-intl.dev)
- **Payment Processing**:
  - [ ] [Autumn](https://useautumn.com)
  - [ ] [Creem](https://www.creem.io)
  - [ ] [Dodo](https://dodopayments.com)
  - [ ] [Lemon Squeezy](https://www.lemonsqueezy.com)
  - [ ] [Paddle](https://www.paddle.com)
  - [ ] [Polar](https://polar.sh)
  - [ ] [Razorpay](https://razorpay.com)
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
const res = await apiClient.health.$get()
const data = await res.json()
```

---

## ⚙️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3.0 or later)

### Installation

1. Clone this template:

   ```bash
   bunx gitpick https://github.com/nrjdalal/zerostarter/tree/main
   cd zerostarter
   ```

   > **Note**: The `main` branch is the latest stable release.

2. Install dependencies:

   ```bash
   bun install
   ```

   > **Note**: If the installation fails, try using `bun install --ignore-scripts`

3. Set up environment variables:

   Create a `.env` file in the root directory with the following variables:

   ```
   NODE_ENV=local

   # -------------------- Server variables --------------------

   HONO_APP_URL=http://localhost:4000
   HONO_TRUSTED_ORIGINS=http://localhost:3000

   # Generate using `openssl rand -base64 32`
   BETTER_AUTH_SECRET=

   # Generate at `https://github.com/settings/developers`
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=

   # Generate at `https://console.cloud.google.com/apis/credentials`
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Generate using `bunx pglaunch -k`
   POSTGRES_URL=

   # -------------------- Client variables --------------------

   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

### Database Setup

1. Ensure your PostgreSQL server is running.
2. Run the generation:

   ```bash
   bun run db:generate
   ```

3. Run the migration:

   ```bash
   bun run db:migrate
   ```

### Authentication Setup

ZeroStarter comes with some default authentication plugins using [Better Auth](https://better-auth.com), you can extend as needed.

#### Github

1. Create a GitHub OAuth App at [GitHub Developer Settings](https://github.com/settings/developers).
2. Set the **Homepage URL** to `http://localhost:3000`.
3. Set the **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
4. Copy the **Client ID** and **Client Secret** into your `.env` file.

#### Google

1. Create a Google OAuth App in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials.
2. Configure the OAuth consent screen (External).
3. Create an **OAuth Client ID** (Application type: Web).
4. Set the **Authorized JavaScript origins** to `http://localhost:3000`.
5. Set the **Authorized redirect URI** to `http://localhost:4000/api/auth/callback/google`.
6. Copy the **Client ID** and **Client Secret** into your `.env` file.

### Running the Application

```bash
bun dev
```

### Running the Application with Docker Compose

```bash
docker compose up
```

### Accessing the Application

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:4000](http://localhost:4000)

---

## 📜 Scripts

### Development

- `bun run dev`: Start the development servers.

### Maintenance

- `bun run clean`: Clean the cache and build artifacts.
- `bun run lint`: Lint the codebase using Oxlint.
- `bun run format`: Format the codebase using Prettier.
- `bun run check-types`: Check the types of the codebase.

### Production

- `bun run build`: Build the applications.
- `bun run start`: Start the production servers.

### Database

- `bun run db:generate`: Generate Drizzle migrations.
- `bun run db:migrate`: Run Drizzle migrations.
- `bun run db:studio`: Open Drizzle Studio to view/edit data.

## 📖 Deployment

- **Frontend**:
  - [Vercel](.github/docs/deployment/vercel.md#vercel)
- **Backend**:
  - [Vercel](.github/docs/deployment/vercel.md#vercel-1)

## 🤝 Contributing

Contributions welcome — any help is appreciated!

- Fork the repo and create a branch (use descriptive names, e.g. `feat/{name}` or `fix/{name}`).
- Make your changes, add tests if applicable, and run the checks:
  - `bun run build`
  - `bun run check-types`
  - `bun run format`
  - `bun run lint`
- Follow the existing code style and commit message conventions (use conventional commits: feat, fix, docs, chore).
- Open a PR describing the change, motivation, and any migration notes; link related issues.
- For breaking changes or large features, open an issue first to discuss the approach.
- By contributing you agree to the MIT license and the project's Code of Conduct.

Thank you for helping improve ZeroStarter!

## 📄 License

This project is licensed under the [MIT](https://github.com/nrjdalal/zerostarter/blob/canary/LICENSE.md) License.

<!-- trigger build: 5 -->
