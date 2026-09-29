# WebSockets on Vercel through Bun.serve()

- Status: idea
- Links: PR #674 (the Node adapter split), docs audit 2026-09-19, [Vercel WebSockets](https://vercel.com/docs/functions/websockets#bun), [Vercel Bun runtime](https://vercel.com/docs/functions/runtimes/bun)

`api/hono/src/lib/server.ts` picks a WebSocket adapter at boot: `hono/bun` and `Bun.serve()` everywhere except Vercel, where it switches to `@hono/node-server` + `ws` and exports the http server. That split exists because, when #674 shipped, a Vercel Function could not run `Bun.serve()` at all.

That is no longer true. Vercel's Bun runtime now accepts `Bun.serve()` as an entrypoint and documents a native WebSocket path through it. If the api ran that way on Vercel, the adapter branch, the `ws` and `@hono/node-server` dependencies and the second server export could all go, and local, Docker and Vercel would run one code path.

Why it is only an idea:

- Both the Bun runtime and WebSockets are in beta on Vercel.
- Vercel lists differences from a standalone Bun server: headers passed to `server.upgrade()` are not applied to the upgrade response, the `drain` handler is never invoked, and `socket.send()` does not return the `-1` backpressure status. `hono/bun`'s `upgradeWebSocket` has to be checked against each.
- The api deploys with the Hono framework preset and a self-contained bundle, not the Bun preset's `server.ts` entrypoint, so the entrypoint shape would change too.
- The Node adapter path is the one Vercel documents for Hono, and it is proven here, production included.

To evaluate: deploy a preview with the Bun path, confirm `/api/health/ws` upgrades and streams, confirm the REST routes and `/api/docs` are unchanged, and check cold-start and duration behaviour against the adapter. Per the repo's own rule, prove it on a real preview, not locally.
