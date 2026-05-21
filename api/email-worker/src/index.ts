interface EmailMessageBuilder {
  to: string | string[]
  from: string | { email: string; name: string }
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | { email: string; name: string }
  headers?: Record<string, string>
}

interface EmailBinding {
  send(message: EmailMessageBuilder): Promise<unknown>
}

interface Env {
  EMAIL: EmailBinding
  DOMAIN: string
  EMAIL_SENDING: string
}

interface SendBody {
  from_alias: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

const ALIAS_PATTERN = /^[a-z0-9._-]+$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const validateRecipients = (to: string | string[]) => {
  const list = Array.isArray(to) ? to : [to]
  if (list.length === 0 || list.length > 50) return false
  return list.every((addr) => typeof addr === "string" && EMAIL_PATTERN.test(addr))
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method !== "POST" || url.pathname !== "/send") {
      return json({ error: "not_found" }, 404)
    }

    if (req.headers.get("authorization") !== `Bearer ${env.EMAIL_SENDING}`) {
      return json({ error: "unauthorized" }, 401)
    }

    let body: SendBody
    try {
      body = (await req.json()) as SendBody
    } catch {
      return json({ error: "invalid_json" }, 400)
    }

    const { from_alias, to, subject, text, html } = body
    if (!from_alias || !to || !subject || (!text && !html)) {
      return json(
        { error: "missing_fields", required: ["from_alias", "to", "subject", "text|html"] },
        400,
      )
    }
    if (!ALIAS_PATTERN.test(from_alias)) {
      return json({ error: "invalid_from_alias" }, 400)
    }
    if (!validateRecipients(to)) {
      return json({ error: "invalid_to" }, 400)
    }

    const from = `${from_alias}@${env.DOMAIN}`

    try {
      await env.EMAIL.send({ to, from, subject, text, html })
    } catch (err) {
      return json({ error: "send_failed", message: (err as Error).message }, 502)
    }

    return json({ ok: true, from, to })
  },
}
