# Build-time split-deploy decision (stop shipping the suffix predicate to the client)

- Status: iceboxed (raised in #720 review; a concrete doable core is identified)
- Links: #720 (the curated `PUBLIC_HOSTING_SUFFIXES` set and `isSplitPair` live there) · relates to #677 (preview wiring)

**Concern.** `isSplitPair` / `isPublicHostingSuffix` (and the curated `PUBLIC_HOSTING_SUFFIXES` set) run in the web client too, `access.tsx` calling `isSplitPair(config.app.url, config.api.url)` to choose the sign-in flow. So the suffix predicate ships in the browser bundle. That is exactly why a full Public Suffix List library, e.g. [tldts](https://github.com/remusao/tldts), was rejected here: it would ship tens of KB of PSL to the client.

**The doable core (build-time only: no runtime, no bundle).** `isSplitPair(config.app.url, config.api.url)` is a build-time constant, since both URLs are `NEXT_PUBLIC_` values inlined at build. So resolve the split/deploy decision once during the build and emit a plain constant (e.g. `IS_SPLIT`, or the deploy-mode enum) that the client imports. Then the client carries no suffix logic and nothing runs at request time. This part is clearly feasible and is the high-priority piece: strong candidate to graduate to the backlog and be scheduled right after #720 ships.

**Open question (the genuinely undecided part).** Once the client is a precomputed constant, whether to adopt `tldts` at that build step for full-PSL correctness (multi-level eTLDs like `.co.uk`, every `github.io`-style rule) or keep the curated ~10-platform set is a judgement call. The curated set already covers realistic hosting targets, so the correctness win is marginal, and `tldts` at the build step only earns its keep if generality is wanted. No verdict yet.

**Server note.** The server resolves the deploy mode at boot from `process.env` on purpose, so one built api artifact stays portable across environments (the Docker/self-host image is built once, configured at `docker run`). So server-side it is a boot-time lookup regardless of library, a single lookup at init, never per-request; the curated set avoids a server dependency there entirely. Any `tldts` adoption should stay client-build-time and leave the server as-is unless there is a separate reason.

**Sequencing.** After #720 is reviewed and shipped. First move: the build-time client constant (removes the predicate from the browser); the `tldts`-vs-curated call is a separate follow-on decision.
