---
name: ui-verify
description: Verify a frontend or UI change in a real browser with agent-browser and attach screenshot evidence. Use after any change to web/next pages, components, or styles, before opening or updating a PR, or when an end-to-end flow needs checking.
---

# UI Verify

A green type-check and a clean lint do not prove a page renders. For any frontend or UI change, drive the real app in a browser, confirm the change works, and attach screenshots to the PR. Never sign off a UI change on type-check and lint alone.

## Workflow

### 1. Run the stack

Start the dev servers (see the `dev` skill): web on :3000, api on :4000.

### 2. Drive the real page with agent-browser

Use the `agent-browser` skill to open the affected route and interact with it. Confirm the change renders and behaves, not just that it compiles.

```bash
agent-browser open http://localhost:3000/<route>
agent-browser snapshot   # read the page, then act on it
```

Anything behind auth: sign in first with the dev-only Login (agents) button or the local sign-in (see the `dev` skill). For an end-to-end change, or whenever asked, exercise the whole flow: navigate, act, and verify the result end to end, not just the one screen you touched.

### 3. Check it holds up

- **Visual change:** capture the state before and after at the same viewport.
- **Responsive:** check mobile, tablet, and desktop with `agent-browser set viewport <w> <h>`, and confirm no horizontal overflow: `agent-browser eval 'document.documentElement.scrollWidth <= document.documentElement.clientWidth'`.
- **Theme:** check light and dark when the change touches either.

### 4. Attach evidence to the PR

Upload each screenshot to litterbox, a temporary host, and embed the returned URL in the PR. Do not commit binary screenshots into the repo.

```bash
curl -sS -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@screenshot.png" \
  https://litterbox.catbox.moe/resources/internals/api.php
```

Valid `time` values: `1h`, `12h`, `24h`, `72h`. The command prints the public URL to embed.
