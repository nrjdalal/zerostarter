// First-party handoff primitives shared by the api (mint and validate) and the web sign-in flow, so they live in the client-safe config package rather than in @packages/auth, whose module init reads server env and must never reach the client bundle. Split-mode detection is not here: the server derives it from its baked tldts breakdown, the web from the build-time NEXT_PUBLIC_SPLIT_AUTH, so no Public Suffix List ships to either bundle.

// Name of the first-party cookie that binds a split-mode sign-in to the browser that started it: set on the web origin, matched by the api's handoff claim. Its Max-Age (10 min) bounds how long after a sign-in is requested the flow may still complete, so a fork that raises a magic-link expiry past 10 min gets a silent handoff failure when the link is opened after the cookie lapses; keep the two in step. (A parked handoff row is itself claimable only for its 60s TTL.)
export const HANDOFF_NONCE_COOKIE = "handoff_nonce"

// A single-use handoff token (the id or the nonce): two UUIDs of entropy with hyphens stripped, so the whole 64-char value is the secret. Shared so the web (mint) and api (validate) agree on the shape.
export function mintHandoffToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "")
}

// The exact shape mintHandoffToken emits (64 lowercase hex chars). The api validates ids and nonces against this so a malformed value is rejected before any lookup, and it lives beside the minter so the two can never drift.
export const HANDOFF_TOKEN_PATTERN = /^[0-9a-f]{64}$/
