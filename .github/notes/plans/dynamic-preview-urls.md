# Dynamic per-branch preview URLs (alias-on-deploy)

- Status: planned
- Links: #677 · related #674 (where manual canary aliasing surfaced this)

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

**Required code change (api CORS becomes a predicate):** `HONO_TRUSTED_ORIGINS` is a static allowlist; dynamic preview origins need `cors({ origin })` to be a function that also accepts `https://<slug>.zerostarter.dev` and `https://<slug>.api.zerostarter.dev` in non-production, keeping production and canary on the explicit list. This is a security decision (trusting any `*.zerostarter.dev` origin with credentials in preview only).

**Edge cases / open decisions:**

- Trigger: `deployment_status` (react to Vercel's own build, above) vs a CI `vercel deploy` (self-contained but rebuilds).
- Nameservers vs the delegation workaround.
- Scope: all branches vs long-lived only.
- Project detection currently keys off the `apizerostarter` URL prefix; revisit if a project slug changes.
- Stale aliases on branch delete (Vercel prunes deployments; aliases may linger). Optional cleanup follow-up.

**Rollout:** provision wildcard domains + DNS, land the CORS predicate, add the action, verify on a throwaway branch that `<slug>.zerostarter.dev` + `<slug>.api.zerostarter.dev` resolve and the badge goes live over WS.

**Considered alternative: self-wiring pairs on the default `*.vercel.app` URLs (no DNS/certs).** Surfaced during #720 (split-deploy auth), deferred. `VERCEL_BRANCH_URL` is always `<project-slug>-git-<branch>-<team>.vercel.app`, and for the same branch in the same team the `-git-<branch>-<team>.vercel.app` tail is byte-identical across the sibling projects; only the leading slug differs. So each side can compute the other with no per-branch env: `peerURL = "https://" + <peer-slug> + VERCEL_BRANCH_URL.slice(indexOf("-git-"))`. The only value that can't be derived is `<peer-slug>` (the sibling's arbitrary Vercel project name), so it needs one stable non-secret constant per project (e.g. `VERCEL_PEER_SLUG`, preview-scoped); a small build hook could fill `NEXT_PUBLIC_API_URL` (web) and the trusted web origin (api) before the deploy-mode resolution bakes. Trade-offs vs alias-on-deploy: no wildcard DNS/cert/Action and it works for any fork naming, but it keeps the opaque `vercel.app` URLs, still trusts a derived preview origin, and breaks past Vercel's 63-char branch-alias truncation (a long branch name yields a hashed alias the naive concat won't match). Weigh the two when this is planned; they are not mutually exclusive (the concat could seed the CORS predicate).
