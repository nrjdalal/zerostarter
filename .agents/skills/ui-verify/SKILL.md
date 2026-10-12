---
name: ui-verify
description: Verify a frontend or UI change in a real browser. Use after any change to web/next pages, components, or styles, before opening or updating a PR, or when an end-to-end flow needs checking.
source: local
---

# UI Verify

A green type-check and a clean lint prove the code compiles, not that the page renders. Drive it in a real browser before the PR.

## 1. Run the stack

Start the stack and resolve `$WEB` and `$API` the way the `dev` skill does. Done when `$WEB/` returns 200 and `$API/api/health` answers ok.

## 2. Drive the affected route

Load the `agent-browser` skill, then open the route you changed in a named session and act on it:

```bash
agent-browser --session <task> open "$WEB/<route>"
agent-browser --session <task> snapshot   # read the page, then click/type/verify
```

The navbar's controls render after hydration, so a snapshot or screenshot taken on load can lack them; take it again a moment later.

Behind auth, sign in first as the agent (the `dev` skill's login). For an end-to-end change, or whenever asked, drive the whole flow rather than the one screen you touched. Done when you have watched the change render and behave, beyond the route merely loading.

## 3. Check it holds up

- **Visual:** capture before and after at the same viewport (the 1782×972 default, `agent-browser set viewport 1782 972`; see the `agent-browser` skill). The before is the pre-change state, in the same auth state as the after: the production deployment, or the pre-change commit checked out in another worktree, as `before.png`; then your change as `after.png`.
- **Responsive:** check mobile (390×844), tablet (820×1180), and desktop (1782×972) with `agent-browser set viewport <w> <h>`, and confirm no horizontal overflow: `agent-browser eval 'document.documentElement.scrollWidth <= document.documentElement.clientWidth'`.
- **Theme:** check light and dark whenever the change touches either, through the navbar's theme toggle, or `agent-browser set media dark` and `light` on a page without the navbar.

Done when Visual, Responsive, and Theme are each exercised (or consciously marked N/A) for the surfaces this change touches.

## 4. Attach evidence to the PR

Attach each screenshot with the GitHub CLI, which uploads it as an asset of the PR, so the repo carries no binary screenshot:

```bash
gh pr comment <n> --body-file body.md \
  --attach './before.png#Before: what it shows' --attach './after.png#After: what it shows'
```

`--attach` takes `<file>#<alt text>`, repeats, and needs gh 2.100 or newer. A `![alt](./before.png)` in the body is rewritten to the uploaded asset; files the body does not reference are appended. On an older gh, fall back to a temporary host and embed the URL it prints:

```bash
curl -sS -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@screenshot.png" \
  https://litterbox.catbox.moe/resources/internals/api.php
```

Done when every screenshot (before and after pairs for a visual change) is on the PR.
