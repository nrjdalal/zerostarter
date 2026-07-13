# Dynamic per-branch preview URLs (alias-on-deploy)

- Status: planned
- Links: #677 · related #674 (where manual canary aliasing surfaced this) · shares the host/cookie model with [portless-local-urls.md](portless-local-urls.md)

Replace opaque generated preview URLs (e.g. `zerostarter-op988nll0-nrjdalal.vercel.app`) with predictable per-branch URLs on our own domains, for both projects:

- web: `<branch>.zerostarter.dev`
- api: `<branch>.api.zerostarter.dev`

Prefix the branch slug as the leftmost label of each project's production host. DNS/Vercel wildcards only match the leftmost label, so `*.api.zerostarter.dev` catches every branch, while nothing can dynamically match `api.<branch>.zerostarter.dev`. The one-off `api.canary.zerostarter.dev` used during #674 should migrate to `canary.api.zerostarter.dev`.

**Approach:** wildcard domains plus a GitHub Action that aliases each Vercel preview deployment. Chosen over the native Preview Deployment Suffix (paid add-on, team-wide single suffix, keeps the long generated format). The two-domain (cross-origin) model is retained because WebSockets need cross-origin: the `/api` same-origin proxy in `next.config.ts` is HTTP-level and does not carry WS upgrades to a separate deployment.

**Prerequisites (one-time, owner action):**

1. Wildcard domains on the projects: `*.zerostarter.dev` -> web, `*.api.zerostarter.dev` -> api.
2. Wildcard certificate. `zerostarter.dev` is on third-party nameservers, so either switch to Vercel nameservers (`ns1`/`ns2.vercel-dns.com`), or delegate per subdomain:
   ```
   _acme-challenge.<sub>  NS     ns1.vercel-dns.com.
   _acme-challenge.<sub>  NS     ns2.vercel-dns.com.
   *.<sub>                CNAME  cname.vercel-dns-0.com.
   ```
   (warning: delegating `_acme-challenge` can block other providers from issuing certs for that subdomain).
3. Repo secret `VERCEL_TOKEN` (team-scoped) for the action.

**The action (`.github/workflows/alias-preview-urls.yml`):**

```yaml
name: alias-preview-urls

on:
  deployment_status: {}

permissions:
  deployments: read

jobs:
  alias:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Resolve slug, project, target domain
        id: vars
        env:
          REF: ${{ github.event.deployment.ref }}
          ENV: ${{ github.event.deployment_status.environment }}
          URL: ${{ github.event.deployment_status.environment_url }}
        run: |
          # only preview deployments
          case "$ENV" in Production|production) echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0;; esac
          # slugify branch: lowercase, non-alnum -> '-', cap length, then trim so truncation can't leave a trailing '-' (invalid DNS label)
          slug=$(echo "$REF" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | cut -c1-40 | sed -E 's/^-+|-+$//g')
          # protected branches own dedicated domains; never clobber them
          case "$slug" in canary|main|master|production) echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0;; esac
          host=$(echo "$URL" | sed -E 's#https?://([^/]+).*#\1#')
          if echo "$host" | grep -q '^apizerostarter'; then domain="$slug.api.zerostarter.dev"; else domain="$slug.zerostarter.dev"; fi
          {
            echo "skip=false"
            echo "url=$URL"
            echo "domain=$domain"
          } >> "$GITHUB_OUTPUT"
      - name: Alias
        if: steps.vars.outputs.skip != 'true'
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        # pin the CLI version deliberately (supply-chain), do not use @latest
        run: npx vercel@<pin> alias set "${{ steps.vars.outputs.url }}" "${{ steps.vars.outputs.domain }}" --token "$VERCEL_TOKEN" --scope nrjdalal
```

**Required code changes (the "fix for once", shared with [portless-local-urls.md](portless-local-urls.md)):**

1. **Cookies.** The 4-label preview API host `<slug>.api.zerostarter.dev` breaks today's cookie helpers (`packages/auth/src/lib/utils.ts`): `getCookieDomain` returns `.api.zerostarter.dev` (not shared with the web host `<slug>.zerostarter.dev`) and `getCookiePrefix` returns `"api"` - because they assume the _old_ label order `<service>.<env>.<app>.<tld>` (service leftmost). Adopt the unified grammar `<slug>.api.<app>.<tld>` (slug leftmost, `api` just left of the base) and rework both helpers off the registrable domain: `getCookieDomain` = `.` + last two labels; `getCookiePrefix` = labels before the base minus a trailing `api`. Then web+api share `.zerostarter.dev` at any prefix depth and each branch/env namespaces its cookie name. This requires the `api.canary.zerostarter.dev` -> `canary.api.zerostarter.dev` migration below (only the new order parses).
2. **CORS + trusted origins.** `HONO_TRUSTED_ORIGINS` stays the explicit allowlist; dynamic origins need one predicate reused by Hono `cors({ origin })` and better-auth `trustedOrigins`: accept if in the explicit list, **or** `NODE_ENV !== "production"` and the host matches `*.<baseDomain>`. This is a security decision (trusting any `*.zerostarter.dev` origin with credentials in preview only); the same predicate covers local `*.zerostarter.localhost`.

**Edge cases / open decisions:**

- Trigger: `deployment_status` (react to Vercel's own build, above) vs a CI `vercel deploy` (self-contained but rebuilds).
- Nameservers vs the delegation workaround.
- Scope: all branches vs long-lived only.
- Project detection currently keys off the `apizerostarter` URL prefix; revisit if a project slug changes.
- Stale aliases on branch delete (Vercel prunes deployments; aliases may linger). Optional cleanup follow-up.

**Rollout:** land the cookie + CORS/trusted-origins fix (shared with portless-local-urls.md; migrate canary to `canary.api.zerostarter.dev` in the same release, shared DB), provision wildcard domains + DNS, add the action, verify on a throwaway branch that `<slug>.zerostarter.dev` + `<slug>.api.zerostarter.dev` resolve, a full sign-in works cross-subdomain, and the badge goes live over WS.
