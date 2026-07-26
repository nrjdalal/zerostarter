import type { ActivityAction } from "@packages/config/console"

import { activity } from "@/schema/console"
import type { Transaction } from "@/types"

// Who acted: a person, who has an account and is recognised by their email, or something that is not a person and says what it was. Two shapes rather than one email field, because three of the callers here are a matching rule, a bootstrap and a CLI, and calling those an email made the type say something untrue about them.
export type ActivityActor = { email: string; id: string } | { label: string }

// Every summary is written here, so the console routes and the sign-in grant all read the same and the wording is one edit. The exception is .github/scripts/console-roles.ts, which cannot import this package from the repo root and so restates the three rung sentences; tests/github/scripts/console-roles.test.ts fails if the two drift apart.
// Each one is a sentence that stands on its own: the Action column is a filter, not the only thing telling you what happened, and a line pasted somewhere else has no column beside it at all.
// A null from is an account that had no rung at all.
// A rung set to what it already was is not refused anywhere, and it still stamps role_set_at, which is the record that stops a later allowlist rule lifting the account. So it is worth a line, just not one claiming a change: it says the rung was decided, which is what actually happened.
export const roleChangeSummary = (email: string, from: string | null, to: string) => {
  if (from === to) return `Confirmed ${email} at ${to}`
  return from ? `Changed ${email} from ${from} to ${to}` : `Set ${email} to ${to}`
}

export const banSummary = (email: string) => `Banned ${email}, ending their sessions`

export const unbanSummary = (email: string) => `Unbanned ${email}`

export const allowlistAddSummary = (value: string) => `Added ${value} to the allowlist`

export const allowlistRemoveSummary = (value: string) => `Removed ${value} from the allowlist`

// Takes the caller's transaction, not a database handle, so the record shares the fate of the change it describes: an event always means the change happened, and a change cannot happen unrecorded. Passing the connection instead would make that a convention; this makes it the only thing that compiles.
export type ActivityEvent = { action: ActivityAction; actor: ActivityActor; summary: string }

export async function recordActivity(tx: Transaction, event: ActivityEvent | ActivityEvent[]) {
  const events = Array.isArray(event) ? event : [event]
  // Nothing to say is not an insert. A set route can end with every row refused, and an empty VALUES list is a syntax error rather than a no-op.
  if (events.length === 0) return
  // One statement for a set: a hundred-row ban would otherwise spend a hundred round trips inside the transaction that holds the owner lock, and every other console write waits on that window.
  await tx.insert(activity).values(
    events.map((entry) => ({
      action: entry.action,
      actor: "label" in entry.actor ? entry.actor.label : entry.actor.email,
      actorId: "label" in entry.actor ? null : entry.actor.id,
      summary: entry.summary,
    })),
  )
}
