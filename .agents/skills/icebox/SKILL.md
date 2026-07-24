---
name: icebox
description: "Icebox a raised-but-undecided concern instead of forcing a plan-or-dismiss call: record it with no verdict so the context survives. Use when a review, PR, audit, or eval surfaces something real-maybe that should not be scheduled or closed yet, or when the user says to icebox or park an item."
source: local
---

# Icebox

Some concerns are real yet not decidable right now. Forcing one into a plan overstates it; closing it loses the context. **Ice** is the third option: park the concern verbatim, with no verdict, until someone can rule on it. It sits between the plans backlog and a closed issue. The full definition and the standing index live in `.github/notes/plans/README.md`.

## What belongs on ice

Ice is only for the genuinely undecided, all three at once:

- **Raised** by a review note, a PR follow-up, or an audit or eval finding.
- **Not schedulable** into the plans backlog, because no next action is agreed.
- **Not resolvable** as fix-it or not-a-problem with any confidence.

A known next action belongs in the plans backlog; a confident verdict gets shipped or closed. Everything else waits on ice until it thaws into one of those.

## Park it

1. Write the concern to `.github/notes/plans/<slug>.md`, or append a section to a fitting file: state the concern, its context, and the open question, with no plan and no verdict. Done when a reader grasps what is unresolved and finds no recommendation.
2. Link it under `## Icebox` in `.github/notes/plans/README.md`. Done when the index points at the file.
3. Mirror the one-liner and the `plans/<slug>.md` path as an unchecked box on the standing Icebox issue (#707). Done when `gh issue view 707` shows it.

## Thaw

An item leaves ice only by being decided. When that happens, check its box in #707, record the outcome (shipped, dismissed, or moved to the backlog), and graduate its write-up to the plans backlog or delete it.
