# An authenticated WebSocket pattern

- Status: icebox
- Links: issue #707 (carried there since July as "Authenticated WebSocket ticket pattern"), PR #674 (WebSockets on Vercel), PR #727 (split deploys route the browser through the web's `/api` proxy)

## The concern

The starter ships one WebSocket route, `/api/health/ws`, and it is public on purpose: it streams the same snapshot `/api/health` returns. Nothing shows a fork how to open a socket as a signed-in user, and the usual tools do not reach a handshake: a browser cannot set headers on a WebSocket, the handshake skips `cors()`, and the typed client's `$ws()` sends no credentials, so the trusted-origins allowlist that guards every REST route does nothing for a socket route.

## Context

The `api-endpoint` skill and the realtime page cover this in a few sentences: a socket that needs a signed-in user authenticates the upgrade with a token checked inside the handler, and an `Origin` check may sit beside it but authenticates no one, since a client outside a browser sends any `Origin` it likes. The ticket pattern is the common shape of that token: the signed-in client asks an authenticated REST endpoint for a short-lived, single-use ticket, presents it when it connects, and the handler resolves it to a user before accepting. It also sidesteps cookie scope, which matters here, since on a split deploy the session cookie is first-party to the web host and never reaches the api host a socket would dial. Whether a socket can ride the web's `/api` rewrite instead depends on who serves it: Next's own server proxies an upgrade to an external rewrite target (`upgradeHandler` in `next/dist/server/lib/router-server.js`), and a `*.vercel.app` deploy is untested.

The write-up this entry pointed at, `plans/portless-local-urls.md`, was removed on 2026-07-14 by the reverts that cleared the way for PR #715 and never returned, so the issue carried a link to nothing until this file.

## Open question

Whether the starter ships a worked authenticated socket (a ticket endpoint, a store for the tickets, and a route that uses it), documents the pattern in the realtime page and leaves the code to forks, or keeps the pattern to the skill's few sentences. A single-use ticket needs somewhere to record that it was spent, and the starter has no shared store today; [the hardening plan](hardening-refactors.md) is waiting on one for the rate limiter too.
