import type { ActivityAction } from "@packages/config/console"

// What each action reads as. Keyed by the action union, so adding one to ACTIVITY_ACTIONS is a compile error here rather than a blank cell.
export const ACTION_LABELS: Record<ActivityAction, string> = {
  "allowlist.add": "Added rule",
  "allowlist.remove": "Removed rule",
  "role.change": "Set role",
  "user.ban": "Banned",
  "user.unban": "Unbanned",
}

export type ActivityEvent = {
  action: string
  actor: string
  actorId: null | string
  createdAt: string
  id: string
  summary: string
}

// What a copy hands over: the rows as JSON.
// Not tab separated, because that only means anything if you also know the column order, and the column order is a presentation choice that moves. Field names travel with the data.
// The action stays its stored code rather than its label for the same reason: a copy carries the fact, and ACTION_LABELS is how the fact is displayed.
// Always an array, even for one row, so anything reading it never has to branch on the shape.
// Fields are rebuilt in reading order rather than passed through, which is the one place this repo's A-Z rule gives way to a meaningful one: alphabetical wedges actorId between actor and createdAt and leaves summary last, so the sentence the row is saying arrives out of order. Written this way a row reads who did what, to what, and when, then carries the two ids for whatever is on the other end of the paste. It also pins the order, so it no longer follows whatever order the API happened to select in.
export function activityJson(events: ActivityEvent[]) {
  const ordered = events.map((event) => ({
    actor: event.actor,
    action: event.action,
    summary: event.summary,
    createdAt: event.createdAt,
    actorId: event.actorId,
    id: event.id,
  }))
  return JSON.stringify(ordered, null, 2)
}
