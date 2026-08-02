# zerostarter

Go from zero to a production-ready SaaS, rebranded and ready to ship.

`zerostarter` scaffolds [ZeroStarter](https://zerostarter.dev), a full-stack TypeScript starter (Next.js web, Hono API, Drizzle + Postgres, better-auth), into a fresh, rebranded project in one command. It fetches the latest starter, renames it to your directory, installs dependencies, and (when Docker is running) provisions a local Postgres and runs migrations.

<p align="center">
  <img src="https://raw.githubusercontent.com/nrjdalal/zerostarter/canary/.github/assets/cli.gif" alt="bunx zerostarter init scaffolds a rebranded product from ZeroStarter" width="900" />
</p>

## Quick start

```bash
# In a new, empty directory (its name becomes your project name):
bunx zerostarter init

# Start the dev servers on named portless .localhost URLs (bunx portless list to see them)
bun run dev
```

That is the whole setup. When Docker is running, `init` provisions a local Postgres and migrates for you; otherwise set `POSTGRES_URL` in `.env` (a hosted database like Neon works) and run `bun run db:migrate`.

## Commands

```bash
bunx zerostarter <command> [dir] [options]
```

| Command        | What it does                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init [dir]`   | Scaffold ZeroStarter into `dir` (default `.`) as a fresh product. Fetches, rebrands to the dir name, installs, and optionally provisions Postgres.    |
| `reinit [dir]` | Re-scaffold an existing git repo (default `.`) as a fresh ZeroStarter, keeping `.git` and your `.env*` files so history, remote, and secrets survive. |
| `sync [dir]`   | Re-baseline an existing fork (default `.`) on the latest ZeroStarter, preserving your content, branding, `package.json` identity, and favicon.        |

### `init`

Scaffold a new product. Run it in an empty directory (its name becomes the project name), or pass a name: `bunx zerostarter init my-app`.

| Option         | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `-y`, `--yes`  | Skip prompts, taking defaults (provisions Postgres when Docker is up) |
| `--db`         | Provision a local Postgres (via pglaunch) and migrate; needs Docker   |
| `--dry-run`    | Print the plan without writing anything                               |
| `-h`, `--help` | Display help                                                          |

### `reinit`

Re-scaffold an existing repo in place. Every file is deleted (except `.git` and `.env*`), the latest ZeroStarter is fetched, and it is rebranded to the directory name. The commit lands on the current branch; push when ready. Requires a clean tree.

| Option         | Description                  |
| -------------- | ---------------------------- |
| `-y`, `--yes`  | Skip the confirmation prompt |
| `-h`, `--help` | Display help                 |

### `sync`

Re-baseline a fork on the latest ZeroStarter. A gitpick overlay updates the starter files while your content, `public/marketing`, branding, `package.json` identity, dev-URL names, and favicon are preserved. Requires a clean tree; lands as a reviewable diff you commit yourself.

Skills you own are preserved too: one you authored, one you edited, or one whose sync note you removed keeps your version, and sync names it in the summary rather than replacing it. A skill vendored from a tool takes the update but keeps that tool as its `source`.

## Requirements

- **[Bun](https://bun.sh)** runs the scaffolded project. If it is missing, the CLI offers to install it for you.
- **Docker** (optional) lets `init` provision a local Postgres and migrate automatically. Without it, point `POSTGRES_URL` at any Postgres and run `bun run db:migrate`.

## Links

- Docs: [zerostarter.dev/docs](https://zerostarter.dev/docs)
- Repository: [github.com/nrjdalal/zerostarter](https://github.com/nrjdalal/zerostarter)

## License

MIT
