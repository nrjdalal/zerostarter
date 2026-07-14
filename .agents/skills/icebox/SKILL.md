---
name: icebox
description: Icebox a raised-but-undecided concern instead of forcing a plan-or-dismiss call: record it with no verdict so the context survives. Use when a review, PR, audit, or eval surfaces something real-maybe that should not be scheduled or closed yet, or when the user says to icebox or park an item.
---

# Icebox

A concern got raised that you cannot honestly schedule or resolve right now. Do not force it into a plan or a dismissal. Put it on ice: record it with no verdict, so the context survives until someone can decide. The Icebox is the middle state between the plans backlog and a closed issue; its full definition and the standing index issue live in `.github/notes/plans/README.md`.

## When it belongs on ice

All three hold:

- **raised**: a review note, a PR follow-up, an audit or eval finding,
- **not schedulable**: no agreed next action, so it is not a plans backlog item,
- **not resolvable**: you cannot say fix-it or not-a-problem with confidence.

A clear next action goes to the plans backlog; a clear verdict gets done or closed. The Icebox is only for the genuinely undecided.

## Park it

1. Write the item to `.github/notes/plans/<slug>.md`, or append a section to a fitting existing file. State the concern, its context, and the open question; give no verdict and no plan. Done when a reader learns the concern and what is unresolved, and finds no recommendation.
2. Add it under `## Icebox` in `.github/notes/plans/README.md`, linking the write-up. Done when the index links the file.
3. Append an unchecked entry to the standing Icebox issue (#707), mirroring the one-liner and the `plans/<slug>.md` path. Done when `gh issue view 707` shows it.

## When an item thaws

An item leaves the Icebox only by being decided. When that happens, check its box in #707, note what happened (shipped, dismissed, or moved to the backlog), and graduate its write-up to the plans backlog or delete it.
