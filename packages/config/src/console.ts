// The console's shared vocabulary, here rather than in @packages/db or @packages/auth because both of those sit above this package and the web cannot import either without dragging a database driver or an auth runtime into its build.
// The actions the console records. Alphabetical, and the value is what the column stores, so adding one here and giving it a label in the console is the whole job.
export const ACTIVITY_ACTIONS = [
  "allowlist.add",
  "allowlist.remove",
  "role.change",
  "user.ban",
  "user.unban",
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]
