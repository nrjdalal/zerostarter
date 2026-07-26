import type { ActivityAction } from "@packages/config/console"

import { activity } from "@/schema/console"
import type { Writer } from "@/types"

// A person, or the thing that acted when no person did. An email either way for a person, since that is what a console reader recognises and searches for.
export type ActivityActor = { email: string; id: string } | { email: string; id?: undefined }

// The one place a rung change is put into words, so the console, the CLI and the sign-in grant all read the same. A null from is an account that had no rung at all.
export const roleChangeSummary = (email: string, from: string | null, to: string) =>
  from ? `${email}, ${from} to ${to}` : `${email}, to ${to}`

// Pass the caller's transaction so the record shares the fate of the change it describes: an event always means the change happened, and a change cannot happen unrecorded. Only the sign-in grant writes outside one, because it is best effort by design and must never stop a sign-in.
export async function recordActivity(
  writer: Writer,
  event: { action: ActivityAction; actor: ActivityActor; summary: string },
) {
  await writer.insert(activity).values({
    action: event.action,
    actor: event.actor.email,
    actorId: event.actor.id,
    summary: event.summary,
  })
}
