---
name: ui-verify
description: Verify a frontend or UI change in a real browser. Use after any change to web/next pages, components, or styles, before opening or updating a PR, or when an end-to-end flow needs checking.
---

# UI Verify

A green type-check and clean lint prove the code compiles, not that the page renders.

## Workflow

### 1. Run the stack

Start the dev servers (`dev` skill). Under the default portless dev the base URLs are named and branch-prefixed, so resolve them once: `WEB=$(bunx portless get zerostarter)` and `API=$(bunx portless get api.zerostarter)` (or `PORTLESS=0 bun run dev` for fixed `http://localhost:3000` / `http://localhost:4000`). Done when `$WEB/` returns 200 and `$API/api/health` responds ok.

### 2. Drive the affected route

Load the `agent-browser` skill, then open the route you changed and act on it:

```bash
agent-browser open "$WEB/<route>"
agent-browser snapshot   # read the page, then click/type/verify
```

Behind auth: sign in first with the **Login (agents)** button (shown once `AGENT_SIGNIN_ENABLED=true`) or the local sign-in (`dev` skill). For an end-to-end change, or whenever asked, drive the whole flow, not just the screen you touched. Done when you have observed the change render and behave, not merely that the route loaded.

### 3. Check it holds up

- **Visual:** capture before and after at the same viewport (the 1782×972 default, `agent-browser set viewport 1782 972`; see the `agent-browser` skill). The "before" is the pre-change state: `git stash` (or check out the pre-change commit), `agent-browser screenshot before.png`, then restore your change and `agent-browser screenshot after.png`.
- **Responsive:** check mobile, tablet, and desktop with `agent-browser set viewport <w> <h>`, and confirm no horizontal overflow: `agent-browser eval 'document.documentElement.scrollWidth <= document.documentElement.clientWidth'`.
- **Theme:** toggle the app's theme control and check light and dark when the change touches either.

Done when Visual, Responsive, and Theme are each exercised (or consciously marked N/A) for the surfaces this change touches.

### 4. Attach evidence to the PR

Upload each screenshot to litterbox (a temporary host) and embed the returned URL in the PR. Never commit a binary screenshot.

```bash
curl -sS -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@screenshot.png" \
  https://litterbox.catbox.moe/resources/internals/api.php
```

Valid `time`: `1h`, `12h`, `24h`, `72h`. The command prints the public URL. Done when every screenshot (before+after pairs for a visual change) has its URL embedded in the PR.
