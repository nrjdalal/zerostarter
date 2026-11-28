import { env } from "@packages/env/web-next"

const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

// PostHog loads once the page has loaded and the browser is idle, as next/script's lazyOnload does, so it stays off every route's first load; init still captures the first pageview
if (token) {
  const start = () =>
    import("posthog-js").then(({ default: posthog }) =>
      posthog.init(token, {
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        defaults: "2026-05-30",
      }),
    )
  const idle = () =>
    "requestIdleCallback" in window ? requestIdleCallback(start) : setTimeout(start)
  if (document.readyState === "complete") idle()
  else window.addEventListener("load", idle, { once: true })
}
