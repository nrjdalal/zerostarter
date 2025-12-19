---
title: How to Contribute
description: Guide for developers who want to contribute to ZEROSTARTER
---

# How to Contribute

Thank you for your interest in contributing to ZEROSTARTER! We welcome contributions from the community to help make ZEROSTARTER better. Here are some ways you can contribute:

## Local Setup


Before contributing, you’ll need to set up the project locally.

## Project Structure

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

   ```
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

This starter uses [Better Auth](https://better-auth.com) with GitHub as the provider.

1. Create a GitHub OAuth App at [GitHub Developer Settings](https://github.com/settings/developers).
2. Set the **Homepage URL** to `http://localhost:3000`.
3. Set the **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
4. Copy the **Client ID** and **Client Secret** into your `.env` file.

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
  
----

## Reporting Issues

If you encounter any bugs, have feature requests, or want to discuss improvements, please [open an issue](https://github.com/nrjdalal/zerostarter/issues) on our GitHub repository. When reporting bugs, please provide detailed information about your environment and steps to reproduce the issue.

## Submitting Pull Requests

We appreciate pull requests for bug fixes, enhancements, or new features. To submit a pull request:

1. Fork the [ZEROSTARTER repository](https://github.com/nrjdalal/zerostarter) on GitHub.
2. Create a new branch from the `canary` branch for your changes.
3. Make your modifications and ensure that the code follows our coding conventions.
4. Write tests to cover your changes, if applicable.
5. Commit your changes and push them to your forked repository.
6. Open a pull request against the `canary` branch of the ZEROSTARTER repository.

Please provide a clear description of your changes in the pull request, along with any relevant information or context.

## Documentation Improvements

Improving the documentation is a great way to contribute to ZEROSTARTER. If you find any errors, typos, or areas that need clarification, please submit a pull request with the necessary changes. The documentation source files are located in the `/web/next/content/docs` directory.

## Spreading the Word

Help spread the word about ZEROSTARTER by sharing it with your friends, colleagues, and the developer community. You can also star our [GitHub repository](https://github.com/nrjdalal/zerostarter), follow us on [Twitter](https://x.com/nrjdalal).

We appreciate all forms of contributions and look forward to collaborating with you to make ZEROSTARTER even better!
