// The console's shared vocabulary, here rather than in @packages/db or @packages/auth because both of those sit above this package and the web cannot import either without dragging a database driver or an auth runtime into its build.
// The actions the console records. Alphabetical, and the value is what the column stores, so adding one here and giving it a label in the console is the whole job.
export const ACTIVITY_ACTIONS = [
  "allowlist.add",
  "allowlist.remove",
  "role.change",
  "user.ban",
  "user.unban",
  "waitlist.remove",
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

// The most ids one set route will take. Shared rather than only enforced server side: the console's tables load more as you scroll and select-all takes every loaded row, so the client has to know where to split a selection rather than discover the limit as a rejected request.
export const MAX_BATCH = 100
