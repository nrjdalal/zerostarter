import type { ActivityAction } from "@packages/config/console"

import { activity } from "@/schema/console"
import type { Transaction } from "@/types"

// Who acted: a person, who has an account and is recognised by their email, or something that is not a person and says what it was. Two shapes rather than one email field, because three of the callers here are a matching rule, a bootstrap and a CLI, and calling those an email made the type say something untrue about them.
export type ActivityActor = { email: string; id: string } | { label: string }

// The one place a rung change is put into words, so the console, the CLI and the sign-in grant all read the same. A null from is an account that had no rung at all.
export const roleChangeSummary = (email: string, from: string | null, to: string) =>
  from ? `${email}, ${from} to ${to}` : `${email}, to ${to}`

// Takes the caller's transaction, not a database handle, so the record shares the fate of the change it describes: an event always means the change happened, and a change cannot happen unrecorded. Passing the connection instead would make that a convention; this makes it the only thing that compiles.
export async function recordActivity(
  tx: Transaction,
  event: { action: ActivityAction; actor: ActivityActor; summary: string },
) {
  await tx.insert(activity).values({
    action: event.action,
    actor: "label" in event.actor ? event.actor.label : event.actor.email,
    actorId: "label" in event.actor ? null : event.actor.id,
    summary: event.summary,
  })
}
