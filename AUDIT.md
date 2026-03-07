# bun audit

> bun audit --audit-level high

Current fixes:

- `hono` overridden to `^4.12.5` — fixes [GHSA-q5qw-h33p-qvwr](https://github.com/advisories/GHSA-q5qw-h33p-qvwr) (arbitrary file access via serveStatic)
- `@hono/node-server` overridden to `^1.19.10` — fixes [GHSA-wc8c-qw6v-h7f6](https://github.com/advisories/GHSA-wc8c-qw6v-h7f6) (authorization bypass for protected static paths via encoded slashes)
