import { env } from "@packages/env/web-next"

const token = env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

// PostHog loads once the page has loaded and the browser is idle, so it stays off every route's first load; init still captures the first pageview. The timeout starts it 2 s after load at the latest, since a page that never goes idle (an animation on a slow device) would otherwise never load it
if (token) {
  const start = () =>
    import("posthog-js").then(({ default: posthog }) =>
      posthog.init(token, {
        api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        defaults: "2026-05-30",
      }),
    )
  const idle = () =>
    "requestIdleCallback" in window
      ? requestIdleCallback(start, { timeout: 2000 })
      : setTimeout(start)
  if (document.readyState === "complete") idle()
  else window.addEventListener("load", idle, { once: true })
}
