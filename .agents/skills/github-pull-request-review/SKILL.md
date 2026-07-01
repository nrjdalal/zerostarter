---
name: github-pull-request-review
description: Turn-based PR review with hard role separation, runnable two ways. Async loop: separate reviewer and author sessions, each takes one turn then waits, the PR is the channel. Transcript: one session plays both roles back-to-back, posting each labeled turn to the PR (the chat gets only a pointer). Either way the reviewer posts a formal review (whole-review body plus inline comments) and the author addresses each finding (fix or rebut), alternating until both signal satisfied. Use to review a PR, respond as the author, run the loop, or self-review a PR as a single-message transcript.
---

# GitHub Pull Request Review

Two roles that never overlap, each running as a **wait-loop**, coordinating only through the PR until both are satisfied:

- **reviewer** - posts its turn (review body + inline comments + thread replies), then loops, waiting for the author. Never edits code, never commits, never authors a fix, never speaks as the author.
- **author** - opens and owns the PR, addresses each finding (fix or rebut), then loops, waiting for re-review. Never submits a review, never resolves threads, never approves.

One turn = read PR state, take exactly **one turn if it is your turn**, never take the other role's turn. All GitHub access goes through `gh`, never web fetch. `gh api` substitutes `{owner}`/`{repo}` from the current repo. Resolve the PR number with `gh pr list --head <branch> --json number,url` or take it from the user.

## Modes

Same handshake and the same GitHub artifacts (formal review, inline comments, thread replies, fix commits, resolves); only the cadence differs:

- **async loop** (two sessions, default) - reviewer and author are separate agent sessions; each takes one turn then waits (see Looping). The PR is the only channel; neither session ever takes the other's turn.
- **transcript** (one session) - a single session plays both roles back-to-back, posting each labeled turn (`Reviewer #1`, `Author #1`, ...) to the PR until both are satisfied or the round cap. No waiting, no Monitor; the chat gets only a one-line pointer. Use for fast self-review of your own PR. See Transcript mode below.

## The handshake

The shared transcript is the PR's reviews and comment threads. Every turn carries a machine-readable trailer so the next agent reads the state with zero guessing. The reviewer's trailer rides in its **review body** (round 1) or its top-level re-review comment (later rounds); the author's rides in its top-level comment. Detection must therefore read **both** the reviews API and the issue comments, since `--json comments` alone never returns review bodies:

- reviewer: `<!-- pr-review role=reviewer round=N state=needs-changes|satisfied -->`
- author: `<!-- pr-review role=author round=N state=ready|satisfied -->`

Read the newest trailer across reviews and comments to decide the turn:

```bash
{ gh api repos/{owner}/{repo}/pulls/<num>/reviews   --jq '.[] | {t: .submitted_at, b: .body}'
  gh api repos/{owner}/{repo}/issues/<num>/comments --jq '.[] | {t: .created_at,  b: .body}'
} | jq -s '(map(select((.b // "") | test("<!-- pr-review "))) | max_by(.t) | .b) // empty' \
  | grep -oE 'role=[a-z]+ round=[0-9]+ state=[a-z-]+' | tail -1   # operative trailer is the LAST match: a turn may quote the other role's trailer above its own
```

- No trailer yet -> round 1, **reviewer's** turn (the author waits).
- Latest is `role=author state=ready` -> **reviewer's** turn (round-0 kickoff -> round 1 full review; otherwise re-review).
- Latest is `role=reviewer state=needs-changes` -> **author's** turn.
- Latest is `role=reviewer state=satisfied` -> **author's** turn (confirm `satisfied`, or contest).
- Latest trailer is **your own role** -> not your turn. Wait (reschedule the loop).
- Most recent reviewer turn is `satisfied` AND most recent author turn is `satisfied` AND no open (unresolved) reviewer threads (read via the `reviewThreads { isResolved }` GraphQL query below) -> **converged**. Stop the loop.

`round` increments by one each time the reviewer takes a turn; the author echoes the round it is answering. Round 0 is the author's kickoff comment requesting the review; the reviewer's first turn is round 1.

## Looping (how each role waits)

Each role is a self-paced loop (`/loop` dynamic mode, or `/schedule` for a durable cadence that survives the session). The loop is only the cadence driver between turns; a single turn is still one-shot.

- **author entry:** open the PR, post the round-0 kickoff comment requesting the review (see author step 1), then start the loop. Each iteration: if the reviewer posted a round you have not answered -> take one author turn; else wait. Opening the PR is not the end of your turn; you are now the author waiting for review.
- **reviewer entry:** on the first iteration where it is your turn (no trailer, or the author's `round=0` kickoff -> round 1) post the full review, then loop. Each later iteration: if the author posted `ready` since your last turn -> take one reviewer turn (re-review); else wait.
- **each iteration:** read the latest trailer (handshake). Your turn -> take exactly one turn, then reschedule. Not your turn -> do nothing, reschedule. Converged -> stop.
- **wake fast:** arm a Monitor on new PR comments/reviews so you wake the moment the other side posts, with a `/schedule` or `ScheduleWakeup` fallback heartbeat (lean 20-30 min) in case nothing fires. Without a Monitor, poll on the heartbeat alone.
- **stop:** convergence (both `satisfied`, no open threads) or the round cap. Never loop forever.

## Transcript mode (single session)

One session plays both roles back-to-back. After opening the PR, run the rounds in sequence, posting every turn to the PR exactly as the role sections below describe (formal review, inline comments, thread replies, fix commits, resolves). The conversation lives on the PR, never pasted into the chat: emit only a one-line pointer per round (PR, round, role, state). The only difference from the loop is cadence: no waiting, no Monitor, no `/schedule`.

Per round N, in order:

1. **Reviewer #N** - reviewer hat, fresh skepticism. Do the full analysis (round 1) or the re-review (later rounds), then post the formal review to the PR with `Reviewer #N` leading its body. Never soften the review because you know you will fix it next: it must stand on its own, scored and filtered exactly as the async reviewer would.
2. **Author #N** - author hat. Fix or rebut each finding (fix in-loop unless genuinely out of scope), push commits, reply in each thread, then post the author turn comment to the PR with `Author #N` leading its body. Thread resolution stays a reviewer action, done when you next wear the reviewer hat.

Continue until `Reviewer #N` is `satisfied` AND `Author #N` is `satisfied` with 0 open threads, or the round cap (default 5) -> escalate to a human. The hard role separation still holds: switch hats sequentially and completely, never blend the review and the fix in the same breath.

## Guardrails

- **Hard role separation.** One role per turn (in transcript mode, switch hats sequentially and completely, never blend a review with its fix). The reviewer never commits, pushes, edits files, or posts as the author. The author never submits a review, resolves threads, or approves.
- **Turns live on the PR, not the chat.** Kickoffs, reviews, replies, and turn comments are GitHub artifacts; post them to the PR. The conversation window gets only a brief pointer (PR, round, role, state), never the pasted turn body. This holds in both modes, including transcript.
- **Loop, do not busy-poll.** One turn per iteration, then reschedule; between iterations the agent is idle, woken by a Monitor on new PR activity or a fallback timer. Every wake re-reads PR state before acting.
- **Forward progress each round.** A reviewer round must either resolve threads the author addressed or add concrete new evidence; never re-assert an unchanged finding. The author must address every open thread (fix, rebut, or defer-with-reason), not a subset.
- **Round cap + escalation.** If the loop has not converged after `R` rounds (default 5), or the same finding is contested twice with no new evidence, stop the loop and escalate: post a top-level comment tagging a human, trailer `state=needs-changes`. Do not loop forever.
- **No new late findings.** After round 1 the reviewer only raises issues in lines the author's new commits touched; pre-existing untouched code is out of scope for later rounds.

---

## Role: reviewer (one turn)

1. **Confirm the turn** (handshake rule). If it is not the reviewer's turn, **wait (reschedule the loop), do not act.**
2. **Eligibility.** Skip if the PR is closed, a draft, or automated.
3. **Analyze.**
   - **Round 1 (full review):** gather context (root `AGENTS.md`, plus any `AGENTS.md`/`CLAUDE.md` in touched dirs; `gh pr diff <num>`; head SHA via `gh pr view <num> --json headRefOid --jq .headRefOid`). Run independent reviewers, one per dimension: AGENTS.md adherence (cite the rule line), bug scan of changed lines, git-history regressions, prior-PR comments that still apply, code-comment guidance. Optional reinforcement, if installed: the `pr-review-toolkit` subagents (`silent-failure-hunter`, `type-design-analyzer`, `pr-test-analyzer`).
   - **Later rounds (re-review):** look only at threads the author addressed/contested since your last turn and the lines their new commits changed. Resolve threads now satisfied; reply in-thread accepting or pushing back **with new evidence**.
4. **Score and filter.** Score each finding 0-100 (0 = false positive / pre-existing, 50 = verified but minor, 80+ = verified, important, or an explicit AGENTS.md violation). Keep only **>= 80**. Not findings: anything a linter/typechecker/compiler/CI catches, pre-existing issues, senior-engineer nitpicks, intentional changes, issues on lines the PR did not modify. Do not build or typecheck.
5. **Post the turn.** The review body is the whole review (overview + verdict + numbered findings); each finding also gets an inline comment carrying the detail and any ` ```suggestion ` block. Assemble JSON and send via `--input` (never pipe a transform straight into gh; a failed transform sends garbage silently):

```bash
jq . review.json >/dev/null && test -s review.json
gh api repos/{owner}/{repo}/pulls/<num>/reviews --method POST --input review.json
```

```json
{
  "commit_id": "<HEAD_SHA>",
  "event": "COMMENT",
  "body": "## Code review\n\n<verdict>. Found N issues:\n\n1. <brief> (`path:line`)\n\n<!-- pr-review role=reviewer round=1 state=needs-changes -->",
  "comments": [
    { "path": "web/start/src/server.ts", "line": 42, "side": "RIGHT", "body": "<detail + reason>\n\n```suggestion\n<fixed line>\n```" }
  ]
}
```

   `event`: blocking finding -> `REQUEST_CHANGES`; only non-blocking notes -> `COMMENT`; clean -> `COMMENT` with "No issues found". **Self-review limit:** GitHub 422s on `APPROVE`/`REQUEST_CHANGES` for your own PR, so when reviewing your own PR always use `event: COMMENT` and let the trailer carry the verdict.
6. **Verdict trailer.** No blocking findings and no open threads -> trailer `state=satisfied` (and `event: APPROVE` if cross-user). Otherwise `state=needs-changes`. Put the trailer in the review body (round 1) or in the top-level re-review comment (later rounds).
7. **Resolve satisfied threads** (reviewer only), then **wait (reschedule the loop) for the author**. Do not touch code.

```bash
# read thread ids + resolution state (REST `.../comments` has no isResolved; GraphQL does)
gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved}}}}}' \
  -F o="$(gh repo view --json owner --jq .owner.login)" -F r="$(gh repo view --json name --jq .name)" -F n=<num> \
  --jq '.data.repository.pullRequest.reviewThreads.nodes'
# count of still-open threads (the convergence/escalation gate)
# ... | jq '[.[] | select(.isResolved | not)] | length'

# resolve a thread once the author has addressed it (REST cannot)
gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}' -F t=<threadId>
```

---

## Role: author (one turn)

1. **Kick off / confirm the turn.** If you just opened the PR and no review exists yet, you are the author at **round 0**: post a kickoff comment to the PR that requests the review and names this skill, then start your loop and wait. The kickoff is the bootstrap that tells a reviewer agent to run, so the loop can self-start. If it is not the author's turn, wait (reschedule the loop).

```bash
# round 0: request the review, hand off to the reviewer, then enter the wait-loop
cat > kickoff.md <<'EOF'
**Review requested** via the `github-pull-request-review` skill.

Reviewer: run this skill in the reviewer role and post round 1 here. I (author) am waiting.

<!-- pr-review role=author round=0 state=ready -->
EOF
test -s kickoff.md && gh pr comment <num> --body-file kickoff.md
```
2. **Read** the latest review body and the open inline threads addressed to you:

```bash
gh api repos/{owner}/{repo}/pulls/<num>/reviews --jq 'max_by(.submitted_at) | {state, body}'
gh api repos/{owner}/{repo}/pulls/<num>/comments --paginate \
  --jq '.[] | {id, path, line, user: .user.login, in_reply_to_id, body}'
```

3. **Resolve each finding.** For every open thread: **fix** it (follow `gh-commit`: atomic conventional commits, push only if the user authorized it) and reply in-thread with the commit SHA, or **rebut** with rationale, or **defer with reason** (park it in the PR Deferred section per `gh-pull-request-description`). Defer ONLY genuinely out-of-scope or larger work; a trivial, in-scope fix to code this PR introduced is fixed in the loop, never deferred to reach convergence faster. The same rule applies to issues you notice in your own work mid-loop. Reply in the existing thread, never a new top-level comment per finding:

```bash
gh api repos/{owner}/{repo}/pulls/<num>/comments/<comment_id>/replies \
  --method POST --field body="Fixed in <sha>: <what changed>."
```

4. **Post the turn.** One top-level comment summarizing addressed / rebutted / deferred, ending with the author trailer: `state=ready` if you expect re-review, `state=satisfied` only if the reviewer's last turn was `satisfied` and you have no open rebuttals.

```bash
test -s response.md && gh pr comment <num> --body-file response.md
```

5. **Wait (reschedule the loop) for re-review.** Do not review, do not resolve reviewer threads, do not approve.

---

## Idempotency

- Reviewer: skip if you already reviewed the current head SHA with no new author turn since.
- Author: skip threads you already replied to for the current reviewer round; never post a duplicate top-level turn for the same round.
- Both: the trailer is the source of truth for whose turn it is; if the latest trailer is your own role, you already took this turn. Wait.
