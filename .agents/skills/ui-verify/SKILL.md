---
name: ui-verify
description: Verify a frontend or UI change in a real browser. Use after any change to web/next pages, components, or styles, before opening or updating a PR, or when an end-to-end flow needs checking.
source: local
---

# UI Verify

A green type-check and a clean lint prove the code compiles, not that the page renders. Drive it in a real browser before the PR.

## 1. Run the stack

Start the dev servers (`dev` skill). Under the default portless dev the base URLs are named and branch-prefixed, so resolve them once: `WEB=$(bunx portless get zerostarter)` and `API=$(bunx portless get api.zerostarter)` (or `PORTLESS=0 bun run dev` for the fixed `http://localhost:3000` / `http://localhost:4000`). Done when `$WEB/` returns 200 and `$API/api/health` responds ok.

## 2. Drive the affected route

Load the `agent-browser` skill, then open the route you changed and act on it:

```bash
agent-browser open "$WEB/<route>"
agent-browser snapshot   # read the page, then click/type/verify
```

Behind auth, sign in first with the **Login (agents)** button (shown once `AGENT_SIGNIN_ENABLED=true`) or the local sign-in (`dev` skill). For an end-to-end change, or whenever asked, drive the whole flow, not just the screen you touched. Done when you have watched the change render and behave, not merely that the route loaded.

## 3. Check it holds up

- **Visual:** capture before and after at the same viewport (the 1782×972 default, `agent-browser set viewport 1782 972`; see the `agent-browser` skill). The "before" is the pre-change state: `git stash` (or check out the pre-change commit), `agent-browser screenshot before.png`, then restore your change and `agent-browser screenshot after.png`.
- **Responsive:** check mobile, tablet, and desktop with `agent-browser set viewport <w> <h>`, and confirm no horizontal overflow: `agent-browser eval 'document.documentElement.scrollWidth <= document.documentElement.clientWidth'`.
- **Theme:** toggle the app's theme control and check light and dark whenever the change touches either.

Done when Visual, Responsive, and Theme are each exercised (or consciously marked N/A) for the surfaces this change touches.

## 4. Attach evidence to the PR

Attach each screenshot with the GitHub CLI, which uploads it as an asset of the PR; never commit a binary screenshot.

```bash
gh pr comment <n> --body-file body.md \
  --attach './before.png#Before: what it shows' --attach './after.png#After: what it shows'
```

`--attach` takes `<file>#<alt text>`, repeats, and needs gh 2.100 or newer. A `![alt](./before.png)` in the body is rewritten to the uploaded asset; files the body does not reference are appended. On an older gh, fall back to a temporary host and embed the URL it prints:

```bash
curl -sS -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@screenshot.png" \
  https://litterbox.catbox.moe/resources/internals/api.php
```

Done when every screenshot (before+after pairs for a visual change) is on the PR.
