---
name: writing-docs
description: Write or rewrite a docs page under web/next/content/docs so it orients the reader, explains the why, and points at the code and skills instead of restating them. Use when adding a docs page, rewriting one, or when a review finds a page that pastes config, restates a skill, or never says when to read it.
source: local
---

# Writing docs pages

A docs page orients one reader around one subject: what it does for them, when they need it, how to tell it is working, and where it sits among its neighbors. The page is the reader's map; the runbook lives in a skill and the facts live in the code, and the page points at both. A page that pastes a config file or restates a skill's steps is a second copy that drifts the moment the first moves, so `doc-sync` spends its time chasing it.

## 1. Pin the page

One subject, one job, one kind. The kind sets the shape of the middle:

| Kind | The reader wants | The middle is |
| --- | --- | --- |
| explanation | to understand why it is built this way | the reasoning, in the subject's own vocabulary |
| how-to | to reach a goal they already understand | the steps, each ending on what the reader sees |
| reference | to look something up | tables, A→Z, one row per option |
| tutorial | to be walked through the first time | one path, in order, with the result of each step |

A page that wants two kinds is two pages. Done when the first paragraph can state the job in one sentence.

## 2. Hunt the questions

Real questions beat invented ones, so look before writing:

```bash
gh issue list --search "<subject>" --state all
gh pr list --search "<subject>" --state all
rg -n -i "<subject>" CHANGELOG.md   # where a changelog exists
```

A question filed twice is one the page owes an answer to; anything renamed or moved in the changelog raises a "where did it go". The count stays honest: a well-discussed subject earns several, an obscure one earns none, and padding teaches nothing. Done when every question comes from a thread, a changelog line, or a plain reading of the subject.

## 3. Check the facts against the code

A page outlives the code it describes, so every claim is re-read at the source before it is kept: a path with `ls`, a script in `package.json`, an env var in `packages/env/src/`, a command by running it, a behavior in the file that implements it, a dependency's claim in the installed package under `node_modules`. The production page is the before: open it beside the source and mark what moved, what was removed, and what was added since. Done when every path, command, env var and behavior on the page is checked against the current source, and the obsolete ones are gone.

## 4. Write the frame

Every page takes this frame as it is rewritten, and the middle is the page's own; today the pages carry only `## Next`, so the frame is what a rewrite converges on.

- **Opening, no heading.** One or two paragraphs: what the subject does for the reader, then the defining constraint, the single fact that makes it behave differently from the obvious default, as a plain sentence rather than a labeled aside. This is the most valuable line on the page.
- **`## When you need this`.** The trigger: reach for this page when. Where a sibling page is confusable, add the other half: for that, see the sibling.
- **`## Prerequisites`**, only when something must already be in place (a running Docker daemon, a Vercel project, an Infisical workspace); a page that runs on a fresh clone has no such section.
- **The middle**, one to three sections in the subject's vocabulary, shaped by its kind. Surface the subject's leading word (the term the reader will think with later: `catalog`, `envelope`, `window`) and use it throughout.
- **`## Common questions`.** Each question in bold, the answer beneath it, sharpest first, no sub-headings. Say the unflattering thing where it is true. Omit the heading when step 2 found nothing.
- **`## It's working if`.** Bullets the reader can check in their own app without opening the source: a URL that renders, an output line, a UI state, an error that names the cause. Omit the heading where the tells stay vague.
- **`## Next`.** Two to four links that situate the page: the neighbor a reader usually needs next, with a because-clause each.

Done when the frame's sections are present in that order, or consciously omitted.

## 5. Point instead of pasting

- A procedure that a skill holds is named and linked (`db-migration`, `docker-test`, `release`), with the page keeping only the why and the trap the skill guards against. The skill carries the steps.
- A config file is linked by path with a one-line gist. An excerpt shows the lines the page is about and names the file; the whole file lives in the repo.
- A branch (two artifacts, four situations, five options) goes in a table or a list, since the reader is scanning for the one row that matches them.
- An operational trap goes in a `<Callout type="warn">`; everything else is prose. GitHub's `> [!NOTE]` syntax renders as a quote here.
- Rationale that the page needs stays; a design argument the page does not need moves to `.github/notes/`.

Done when no fenced block mirrors a repo file whole, and every skill the page touches is linked rather than restated.

## 6. Keep the voice

Third person about the system, `you` for the reader, present tense, a because-clause where a choice needs one: "Your database schema is TypeScript." Humans and agents read the same page, so it names things as the reader meets them (the dashboard, the console, the catalog) and keeps the plumbing to the code links. Specifics over counts that drift ("the console pages" over "the five console pages"). Every claim stands on its own: a finding from a thread keeps its substance and drops who said it, since the reader is choosing a tool and an attribution dates as soon as the position moves. Hyphens, commas and colons carry pauses. Done when the page reads in this voice and every claim stands on its own.

## 7. Register and verify

A new or renamed page is an entry in `web/next/docs.config.ts` first (`doc-sync` step 3); the `.mdx` alone fails the strict gate. Run the gate and the build the way `doc-sync` step 4 says, then open the rendered page (the `ui-verify` skill) and read it once as the reader would, with the production page beside it as the before. Done when the gate and the build pass, the page renders, and `doc-sync` finds no other surface that still says what this page used to.
