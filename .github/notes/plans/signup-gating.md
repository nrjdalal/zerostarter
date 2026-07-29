# Gating who may create an account

- Status: icebox
- Links: PR #758 (the spec this was carved out of, folded out at `690cb07c`)

The Access spec opened with two halves: "no way to say only people at our domain, plus these three addresses" covered both _who reaches the console_ and _who may sign up at all_. The allowlist shipped answering the first. The second now has no answer in the product, and this records that rather than letting it disappear with the plan file.

The pivot was right for the allowlist: signing up and reaching the console are different questions, and one list answering both makes the safe default for one the dangerous default for the other. An empty console grant must admit nobody; an empty sign-up gate must admit everybody. Overloading a single table with that inversion is how an install locks itself out or opens itself up on a flag flip.

What is unresolved is whether a starter should ship the sign-up gate at all, and in what shape:

- A second list, with its own inverted empty semantics, doubling the surface a fork has to understand.
- A predicate in `packages/auth` a fork edits directly, with no UI and no table, which is closer to how most installs actually want it (an env var of allowed domains, or a check against their own customer table).
- Nothing, on the grounds that a public starter's default is public sign-up, and an install that needs otherwise has requirements no generic list satisfies.

No verdict. It sits here because the concern is real and was in the original problem statement, not because a plan exists.

Worth noting what already exists if a fork wants it today: `parseAllowlistRule` and `matchesAllowlist` in `@packages/auth/access` are pure and take any list, so the matching half is written and tested; only the policy and the storage are missing.
