# POC: Vercel Services (one project, two services)

**Throwaway branch.** Validates consolidating zerostarter's two Vercel projects
(`web/next` + `api/hono`) into **one Vercel project** using
[Vercel Services](https://vercel.com/docs/services), without breaking Docker or
the "deployable anywhere" model. Do **not** merge - this is for measurement.

## What changed on this branch

- **Added** root `vercel.json` with a `services` map + `rewrites`. The per-service
  `installCommand`/`buildCommand`/`outputDirectory` are copied **verbatim** from the
  existing `web/next/vercel.json` and `api/hono/vercel.json` - they reference the same
  turbo tasks, so `turbo.json` and the root `package.json` scripts are unchanged.
- **Untouched:** `web/next/vercel.json`, `api/hono/vercel.json` (left for the current
  2-project setup + comparison), the Dockerfiles, `docker-compose.yml`, all app code,
  CORS, the API client, cookies, and env. The app stays cross-origin-capable, so the
  same build runs on Docker and on the two-domain Services setup.

## Why the rewrites have three rules (POC supports both test modes)

1. `has: host == api.zerostarter.dev` -> `api` — the **two-domain** target (api on its
   own subdomain; cross-origin; keeps CORS + cross-subdomain cookies, same as Docker).
2. `/api/(.*)` -> `api` — lets the **single `*.vercel.app` preview** reach the API at a
   path, so you can smoke-test before attaching a second domain.
3. `/(.*)` -> `web` — everything else.

For production you'd keep **one** strategy (host-based for two domains, or path-based
for one). Both are here only so the POC is testable at each stage.

## Prerequisites (your Vercel account/team)

```bash
npx plugins add vercel/vercel-plugin        # Services tooling
```

Enable the **"Services" permission** on the team (the feature is gated).

## Test plan

1. **Local** (no cloud): `vercel dev -L` — confirms the `services` build runs, `/api/*`
   reaches Hono with `basePath("/api")` intact, and bindings inject.
2. **New throwaway project:** `vercel link` to a NEW project (e.g.
   `zerostarter-services-poc`), then `vercel deploy`. The `*.vercel.app` URL validates
   path-based routing (rule 2) + the full build on real infra.
3. **Two-domain / host routing (the #1 unknown):** attach two test subdomains to that
   one project (e.g. `svc-poc.zerostarter.dev` + `api-svc-poc.zerostarter.dev`; update
   the host value in `vercel.json` to match). Confirm each domain routes to its service.
   A single preview URL cannot prove this.
4. **Auth flow:** sign in -> session -> org switch on the deployed POC (cross-origin,
   the two-domain mode), confirm parity with today.

## Open questions to resolve on the POC

- [ ] Does **host-based** routing-to-service work? (Docs only show path-based.)
- [ ] Where does **`bunVersion`** go? It's not a service-config field
      (`web/next/vercel.json` + `api/hono/vercel.json` set it today).
- [ ] **Server-side internal calls:** wire `config.api.internalUrl` to the
      [service binding](https://vercel.com/docs/services/bindings) env var instead of
      `INTERNAL_API_URL` (or keep `INTERNAL_API_URL` set from the binding). Confirm
      `getSession` / set-active-org over the internal network.
- [ ] Confirm the `cd ../..` build commands resolve from each service `root`.

## Cleanup

Delete this branch and the throwaway Vercel project once measured.
