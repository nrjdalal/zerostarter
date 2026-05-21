# @api/email-worker

Cloudflare Worker that sends emails from `<alias>@<to_domain>` to arbitrary recipients via [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) (public beta).

## How it works

- Worker binds `env.EMAIL` to Cloudflare Email Service via `[[send_email]]` in `wrangler.toml`.
- `POST /send` is gated by a `Bearer` shared secret.
- The Worker interpolates `<from_alias>@<to_domain>` server-side — callers cannot spoof the domain.
- SPF, DKIM, and DMARC are auto-configured by Cloudflare on the onboarded domain.

## Setup

### 1. Onboard the domain to Email Service

Cloudflare Dashboard → **Compute > Email Service > Email Sending** → **Onboard Domain** → pick `nrjdalal.com` → let Cloudflare add the SPF / DKIM / MX records. Wait for all records to show **Locked** (5–15 min for DNS propagation).

### 2. Deploy the Worker

```bash
cd api/email-worker
bunx wrangler login
bunx wrangler secret put EMAIL_SENDING   # paste a long random string
bun run deploy
```

### 3. Send

```bash
curl -X POST https://zerostarter-email-worker.nd941z.workers.dev/send \
  -H "Authorization: Bearer $EMAIL_SENDING" \
  -H "Content-Type: application/json" \
  -d '{
    "from_alias": "notes",
    "to": "recipient@example.com",
    "subject": "test",
    "text": "hello from cloudflare email service"
  }'
```

Response: `{ "ok": true, "from": "notes@nrjdalal.com", "to": "recipient@example.com" }`.

## Request schema

| field        | type                      | required         |
| ------------ | ------------------------- | ---------------- |
| `from_alias` | `string` (`[a-z0-9._-]+`) | yes              |
| `to`         | `string \| string[]`      | yes (max 50)     |
| `subject`    | `string`                  | yes              |
| `text`       | `string`                  | one of text/html |
| `html`       | `string`                  | one of text/html |

## Local dev

```bash
bun run dev   # wrangler dev — note: Email Service does not deliver from local
bun run tail  # stream production logs
```
